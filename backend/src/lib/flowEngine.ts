/**
 * Flow Execution Engine
 *
 * checkFlowTrigger() — finds a matching active flow for an inbound message.
 * executeFlow()      — runs a matched flow from step 0.
 * continueFlow()     — resumes a paused flow (after collect_input).
 *
 * Multi-turn state is stored in-memory (correct for single-process deployment).
 * For multi-instance deployments, replace `activeFlowStates` with Redis.
 */

import { eq, and } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { db } from "../db/index.js";
import { chatbotFlows, conversations, messages } from "../db/schema.js";
import { deliverReply, type DeliveryChannel } from "./platformDelivery.js";

type DBFlow         = InferSelectModel<typeof chatbotFlows>;
type DBConversation = InferSelectModel<typeof conversations>;

// ── Step shape (mirrors frontend FlowStep type) ───────────────────────────────

interface FlowStep {
  id: string;
  type: "message" | "quick_replies" | "collect_input" | "condition" | "handoff";
  content?: string;
  options?: string[];
  inputLabel?: string;
  inputKey?: string;
  conditionKey?: string;
  conditionValue?: string;
}

function parseSteps(raw: string): FlowStep[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FlowStep[]) : [];
  } catch {
    return [];
  }
}

// ── In-memory flow state ──────────────────────────────────────────────────────

interface FlowState {
  flowId:          string;
  userId:          string;
  channel:         DeliveryChannel;
  recipientHandle: string;
  stepIndex:       number;
  collectedValues: Record<string, string>;
}

const activeFlowStates = new Map<string, FlowState>();

// ── Trigger matching helpers ──────────────────────────────────────────────────

const GREETING_RE = /\b(hi|hello|hey|howdy|hola|مرحبا|أهلا|سلام|صباح|مساء)\b/i;
const ORDER_RE    = /\b(order|buy|purchase|book|reserve|طلب|اطلب|أريد|حجز)\b/i;
const INQUIRY_RE  = /[?؟]|\b(how|what|why|when|where|who|كيف|ماذا|لماذا|متى|أين|من|هل)\b/i;

function keywordMatches(text: string, triggerValue: string | null): boolean {
  if (!triggerValue) return false;
  const lowerText = text.toLowerCase();
  return triggerValue
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean)
    .some((kw) => lowerText.includes(kw));
}

// ── Check for an active resume-state first, then trigger-match ───────────────

/**
 * Returns a matching flow for `messageText`, or null if none found.
 * Does NOT return a flow when there is already an active state for this
 * conversation — callers should call `continueFlow()` instead.
 */
export async function checkFlowTrigger(
  messageText: string,
  userId: string,
  platform: string,
  conversationId: string,
): Promise<DBFlow | null> {
  // Active flow in progress — caller must use continueFlow()
  if (activeFlowStates.has(conversationId)) return null;

  const flows = await db
    .select()
    .from(chatbotFlows)
    .where(
      and(
        eq(chatbotFlows.userId, userId),
        eq(chatbotFlows.platform, platform),
        eq(chatbotFlows.active, true),
      ),
    );

  if (flows.length === 0) return null;

  // Priority: keyword > greeting > order > inquiry > fallback
  return (
    flows.find((f) => f.trigger === "keyword"  && keywordMatches(messageText, f.triggerValue)) ??
    flows.find((f) => f.trigger === "greeting" && GREETING_RE.test(messageText)) ??
    flows.find((f) => f.trigger === "order"    && ORDER_RE.test(messageText)) ??
    flows.find((f) => f.trigger === "inquiry"  && INQUIRY_RE.test(messageText)) ??
    flows.find((f) => f.trigger === "fallback") ??
    null
  );
}

/**
 * Returns true if there is a paused flow awaiting input for this conversation.
 * Callers should check this BEFORE checkFlowTrigger.
 */
export function hasActiveFlow(conversationId: string): boolean {
  return activeFlowStates.has(conversationId);
}

/** Returns the flowId of the active paused flow, if any. */
export function getActiveFlowId(conversationId: string): string | undefined {
  return activeFlowStates.get(conversationId)?.flowId;
}

// ── Step execution helpers ────────────────────────────────────────────────────

async function sendFlowMessage(state: FlowState, text: string): Promise<void> {
  const result = await deliverReply({
    userId:          state.userId,
    channel:         state.channel,
    recipientHandle: state.recipientHandle,
    text,
  });
  if (!result.ok && "error" in result) {
    console.error(`[flowEngine] delivery failed: ${result.error}`);
  }
}

async function recordOutbound(conversationId: string, text: string): Promise<void> {
  await db.insert(messages).values({
    convId:     conversationId,
    direction:  "outbound",
    content:    text,
    sentBy:     "ai",
    timestamp:  new Date(),
  });
}

// ── Core step runner ──────────────────────────────────────────────────────────

async function runStepsFrom(
  state: FlowState,
  steps: FlowStep[],
  conversationId: string,
): Promise<void> {
  for (let i = state.stepIndex; i < steps.length; i++) {
    const step = steps[i];

    switch (step.type) {
      case "message": {
        const text = step.content ?? "";
        await sendFlowMessage(state, text);
        await recordOutbound(conversationId, text);
        break;
      }

      case "quick_replies": {
        const lines = [step.content ?? ""];
        (step.options ?? []).forEach((opt, idx) => lines.push(`${idx + 1}. ${opt}`));
        const text = lines.join("\n");
        await sendFlowMessage(state, text);
        await recordOutbound(conversationId, text);
        break;
      }

      case "collect_input": {
        // Send the question, then pause and wait for the customer's reply
        const question = step.content ?? (step.inputLabel ?? "");
        await sendFlowMessage(state, question);
        await recordOutbound(conversationId, question);
        state.stepIndex = i + 1;
        activeFlowStates.set(conversationId, state);
        return; // ← paused; resumed by continueFlow()
      }

      case "condition": {
        const stored = state.collectedValues[step.conditionKey ?? ""] ?? "";
        const expected = (step.conditionValue ?? "").toLowerCase();
        // If condition is false, skip to the next non-condition step
        if (stored.toLowerCase() !== expected) continue;
        break;
      }

      case "handoff": {
        if (step.content) {
          await sendFlowMessage(state, step.content);
          await recordOutbound(conversationId, step.content);
        }
        await db
          .update(conversations)
          .set({ status: "open" })
          .where(eq(conversations.id, conversationId));
        activeFlowStates.delete(conversationId);
        console.log(`[flowEngine] handoff → conv ${conversationId} is now open`);
        return;
      }
    }
  }

  // All steps complete
  activeFlowStates.delete(conversationId);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Start executing a flow from the beginning.
 * Increments flow.triggerCount.
 */
export async function executeFlow(
  flow: DBFlow,
  conv: DBConversation,
  recipientHandle: string,
): Promise<void> {
  await db
    .update(chatbotFlows)
    .set({ triggerCount: flow.triggerCount + 1 })
    .where(eq(chatbotFlows.id, flow.id));

  const steps = parseSteps(flow.steps);
  if (steps.length === 0) return;

  const state: FlowState = {
    flowId:          flow.id,
    userId:          conv.userId,
    channel:         conv.channel as DeliveryChannel,
    recipientHandle,
    stepIndex:       0,
    collectedValues: {},
  };

  await runStepsFrom(state, steps, conv.id);
}

/**
 * Resume a paused flow for a conversation where collect_input was waiting.
 * Stores the customer's reply in collectedValues[inputKey], then continues.
 * Returns true if a flow was resumed, false if there was no active state.
 */
export async function continueFlow(
  conversationId: string,
  incomingText: string,
  flowId: string,
): Promise<boolean> {
  const state = activeFlowStates.get(conversationId);
  if (!state || state.flowId !== flowId) return false;

  const [flow] = await db
    .select()
    .from(chatbotFlows)
    .where(eq(chatbotFlows.id, flowId))
    .limit(1);

  if (!flow) {
    activeFlowStates.delete(conversationId);
    return false;
  }

  const steps = parseSteps(flow.steps);
  const waitingStep = steps[state.stepIndex - 1];

  if (waitingStep?.type === "collect_input" && waitingStep.inputKey) {
    state.collectedValues[waitingStep.inputKey] = incomingText;
  }

  await runStepsFrom(state, steps, conversationId);
  return true;
}
