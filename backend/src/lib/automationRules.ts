/**
 * Automation Rules Engine
 *
 * Evaluates a user's active automation rules against an inbound message.
 * Rules can override the AI confidence-based routing with explicit actions.
 *
 * Trigger evaluation order: contains_word → is_question → sentiment_positive
 *   → sentiment_negative (skips new_follower, which has no message text).
 */

import { eq, and } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { db } from "../db/index.js";
import { automationRules } from "../db/schema.js";

type DBRule   = InferSelectModel<typeof automationRules>;
type RuleAction = DBRule["action"];

// ── Sentiment keywords (simple heuristic; replace with Claude call for better accuracy) ──

const NEGATIVE_RE = /\b(bad|awful|terrible|horrible|worst|angry|hate|disgusting|disappointed|broken|wrong|issue|problem|complaint|refund|cancel|never|scam|fraud|unacceptable|رديء|سيء|مشكلة|شكوى|استرداد|إلغاء|غاضب|محبط)\b/i;
const POSITIVE_RE = /\b(great|love|awesome|amazing|excellent|fantastic|perfect|happy|thank|thanks|wonderful|beautiful|brilliant|good|pleased|satisfied|رائع|ممتاز|شكرا|جيد|أحب|مذهل|سعيد|راضي)\b/i;
const QUESTION_RE = /[?؟]|\b(how|what|why|when|where|who|can|could|would|should|is|are|do|does|did|have|has|كيف|ماذا|لماذا|متى|أين|من|هل|ما)\b/i;

// ── Trigger matching ──────────────────────────────────────────────────────────

function evaluateTrigger(
  rule: DBRule,
  text: string,
  channel: string,
): boolean {
  // Channel filter — rule must allow this channel (empty array = all channels)
  let allowedChannels: string[] = [];
  try { allowedChannels = JSON.parse(rule.channels) as string[]; } catch { /* */ }
  if (allowedChannels.length > 0 && !allowedChannels.includes(channel)) return false;

  const lower = text.toLowerCase();

  switch (rule.trigger) {
    case "contains_word": {
      if (!rule.triggerValue) return false;
      return rule.triggerValue
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean)
        .some((kw) => lower.includes(kw));
    }
    case "is_question":
      return QUESTION_RE.test(text);
    case "sentiment_positive":
      return POSITIVE_RE.test(text) && !NEGATIVE_RE.test(text);
    case "sentiment_negative":
      return NEGATIVE_RE.test(text);
    case "new_follower":
      return false; // text-based messages can't match a follower trigger
    default:
      return false;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface RuleMatch {
  ruleId:      string;
  ruleName:    string;
  action:      RuleAction;
  actionValue: string | null;
}

/**
 * Evaluate all active rules for `userId` against the inbound message.
 * Returns the first matching rule's action, or null if none match.
 *
 * Rules are evaluated in creation order (FIFO). The first match wins.
 */
export async function evaluateRules(
  userId: string,
  text: string,
  channel: string,
): Promise<RuleMatch | null> {
  const rules = await db
    .select()
    .from(automationRules)
    .where(and(eq(automationRules.userId, userId), eq(automationRules.active, true)));

  for (const rule of rules) {
    if (evaluateTrigger(rule, text, channel)) {
      return {
        ruleId:      rule.id,
        ruleName:    rule.name,
        action:      rule.action,
        actionValue: rule.actionValue ?? null,
      };
    }
  }
  return null;
}

/**
 * Map a rule action to a reply status, overriding the AI confidence tier.
 * Returns null for actions that don't affect reply routing (e.g. assign_to).
 */
export function ruleActionToReplyStatus(
  action: RuleAction,
): "auto_sent" | "pending" | "escalated" | null {
  switch (action) {
    case "auto_send":    return "auto_sent";
    case "skip_review":  return "auto_sent"; // treated same as auto_send
    case "escalate":     return "escalated";
    case "assign_to":    return null;        // caller handles assignment separately
    default:             return null;
  }
}
