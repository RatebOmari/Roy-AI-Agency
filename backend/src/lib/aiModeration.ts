import Anthropic from "@anthropic-ai/sdk";
import { AI_FAST_MODEL } from "./constants.js";

/**
 * Shared AI-reply moderation core, used by both the inbox (conversations) and
 * the public-comment moderation pipelines.
 *
 * Each caller builds its own system prompt and message turns (a threaded DM
 * reads very differently from a short public comment). This module owns the
 * parts that were previously duplicated line-for-line in both routes: the
 * Claude call, the strict `{ reply, confidence }` JSON parse + clamp, the
 * demo/no-key fallback, and the single definition of the confidence tiers.
 */

/**
 * Language rule shared by every reply-generation prompt.
 *
 * The UI is English-only, but customers write in whatever language they like —
 * so replies always mirror the customer rather than a configured preference.
 * This is a single definition so the inbox and comment pipelines can't drift.
 */
export const LANGUAGE_INSTRUCTION =
  "Write your reply in the SAME language the customer used. " +
  "If they wrote in Arabic, reply in Arabic; if in English, reply in English; " +
  "if they mixed languages, mirror that mix. Match their level of formality and " +
  "dialect where it reads naturally. Never reply in a different language than the customer used.";

/** Confidence at/above which a reply is auto-sent without human review. */
export const AUTO_SEND_THRESHOLD = 85;
/** Confidence at/above which a reply waits for review; below it, it is escalated. */
export const REVIEW_THRESHOLD = 50;

export type ReplyTier = "auto_sent" | "pending" | "escalated";

/** Map a 0–100 confidence to the 3-tier moderation status. */
export function tierFromConfidence(confidence: number): ReplyTier {
  if (confidence >= AUTO_SEND_THRESHOLD) return "auto_sent";
  if (confidence >= REVIEW_THRESHOLD)    return "pending";
  return "escalated";
}

export interface ModeratedReplyInput {
  /** Fully-built system prompt (caller-specific). */
  system: string;
  /** Conversation turns to send to the model. */
  messages: { role: "user" | "assistant"; content: string }[];
  /** Token cap for the reply (inbox uses 512, comments 256). */
  maxTokens: number;
  /** Reply used when the API key is set but the call/parse fails. */
  fallbackReply: string;
  /** Pool of canned replies used in demo mode (no API key). */
  demoReplies: string[];
}

export interface ModeratedReply {
  reply: string;
  /** 0–100. */
  confidence: number;
  replyStatus: ReplyTier;
}

/**
 * Generate an AI reply and its moderation tier. Never throws — on any API or
 * parse failure it degrades to the fallback reply at confidence 55; with no
 * API key it returns a random demo reply at confidence 60–89.
 */
export async function generateModeratedReply(input: ModeratedReplyInput): Promise<ModeratedReply> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  let reply: string;
  let confidence: number;

  if (apiKey) {
    try {
      const anthropic = new Anthropic({ apiKey });
      const response = await anthropic.messages.create({
        model:      AI_FAST_MODEL,
        max_tokens: input.maxTokens,
        system:     input.system,
        messages:   input.messages,
      });

      const raw = response.content[0].type === "text" ? response.content[0].text : "";
      // Claude sometimes wraps the JSON in markdown — extract the object.
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in response");
      const parsed = JSON.parse(jsonMatch[0]) as { reply: string; confidence: number };
      reply      = parsed.reply;
      confidence = Math.max(0, Math.min(100, Math.round(parsed.confidence)));
    } catch {
      reply      = input.fallbackReply;
      confidence = 55;
    }
  } else {
    // Demo mode — plausible mock reply.
    reply      = input.demoReplies[Math.floor(Math.random() * input.demoReplies.length)];
    confidence = 60 + Math.floor(Math.random() * 30); // 60–89
  }

  return { reply, confidence, replyStatus: tierFromConfidence(confidence) };
}
