/**
 * Flow Execution Engine
 *
 * checkFlowTrigger() — finds a matching active flow for an inbound message.
 * executeFlow()      — runs a matched flow from step 0.
 * continueFlow()     — resumes a paused flow (after collect_input).
 *
 * Multi-turn state is persisted in the `flow_sessions` DB table so it
 * survives server restarts and scales across multiple instances.
 */

import { eq, and } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { db } from "../db/index.js";
import { chatbotFlows, conversations, messages, flowSessions } from "../db/schema.js";
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

// ── In-memory flow state shape (working state during a single run) ────────────

interface FlowState {
  flowId:          string;
  userId:          string;
  channel:         DeliveryChannel;
  recipientHandle: string;
  stepIndex:       number;
  collectedValues: Record<string, string>;
}

// ── DB persistence helpers ────────────────────────────────────────────────────

async function saveFlowSession(conversationId: string, state: FlowState): Promise<void> {
  await db
    .insert(flowSessions)
    .values({
      conversationId,
      flowId:          state.flowId,
      userId:          state.userId,
      channel:         state.channel,
      recipientHandle: state.recipientHandle,
      stepIndex:       state.stepIndex,
      collectedValues: JSON.stringify(state.collectedValues),
      updatedAt:       new Date(),
    })
    .onConflictDoUpdate({
      target: flowSessions.conversationId,
      set: {
        stepIndex:       state.stepIndex,
        collectedValues: JSON.stringify(state.collectedValues),
        updatedAt:       new Date(),
      },
    });
}

async function clearFlowSession(conversationId: string): Promise<void> {
  await db
    .delete(flowSessions)
    .where(eq(flowSessions.conversationId, conversationId));
}

async function loadFlowSession(conversationId: string): Promise<FlowState | null> {
  const [row] = await db
    .select()
    .from(flowSessions)
    .where(eq(flowSessions.conversationId, conversationId))
    .limit(1);

  if (!row) return null;

  return {
    flowId:          row.flowId,
    userId:          row.userId,
    channel:         row.channel as DeliveryChannel,
    recipientHandle: row.recipientHandle,
    stepIndex:       row.stepIndex,
    collectedValues: JSON.parse(row.collectedValues) as Record<string, string>,
  };
}

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

// ── Public state checks ───────────────────────────────────────────────────────

/**
 * Returns true if there is a paused flow session in the DB for this conversation.
 * Check this BEFORE checkFlowTrigger.
 */
export async function hasActiveFlow(conversationId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: flowSessions.id })
    .from(flowSessions)
    .where(eq(flowSessions.conversationId, conversationId))
    .limit(1);
  return !!row;
}

/** Returns the flowId of the active paused session, or undefined. */
export async function getActiveFlowId(conversationId: string): Promise<string | undefined> {
  const [row] = await db
    .select({ flowId: flowSessions.flowId })
    .from(flowSessions)
    .where(eq(flowSessions.conversationId, conversationId))
    .limit(1);
  return row?.flowId;
}

// ── Check for trigger match ───────────────────────────────────────────────────

/**
 * Returns a matching flow for `messageText`, or null if none found.
 * Returns null when there is an active session — caller must use continueFlow().
 */
export async function checkFlowTrigger(
  messageText: string,
  userId: string,
  platform: string,
  conversationId: string,
): Promise<DBFlow | null> {
  if (await hasActiveFlow(conversationId)) return null;

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

  return (
    flows.find((f) => f.trigger === "keyword"  && keywordMatches(messageText, f.triggerValue)) ??
    flows.find((f) => f.trigger === "greeting" && GREETING_RE.test(messageText)) ??
    flows.find((f) => f.trigger === "order"    && ORDER_RE.test(messageText)) ??
    flows.find((f) => f.trigger === "inquiry"  && INQUIRY_RE.test(messageText)) ??
    flows.find((f) => f.trigger === "fallback") ??
    null
  );
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
    convId:    conversationId,
    direction: "outbound",
    content:   text,
    sentBy:    "ai",
    timestamp: new Date(),
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
        const question = step.content ?? (step.inputLabel ?? "");
        await sendFlowMessage(state, question);
        await recordOutbound(conversationId, question);
        state.stepIndex = i + 1;
        await saveFlowSession(conversationId, state);
        return; // ← paused; resumed by continueFlow()
      }

      case "condition": {
        const stored   = state.collectedValues[step.conditionKey ?? ""] ?? "";
        const expected = (step.conditionValue ?? "").toLowerCase();
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
        await clearFlowSession(conversationId);
        console.log(`[flowEngine] handoff → conv ${conversationId} is now open`);
        return;
      }
    }
  }

  // All steps complete
  await clearFlowSession(conversationId);
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
 * Returns true if a flow was resumed, false if there was no active session.
 */
export async function continueFlow(
  conversationId: string,
  incomingText: string,
  flowId: string,
): Promise<boolean> {
  const state = await loadFlowSession(conversationId);
  if (!state || state.flowId !== flowId) return false;

  const [flow] = await db
    .select()
    .from(chatbotFlows)
    .where(eq(chatbotFlows.id, flowId))
    .limit(1);

  if (!flow) {
    await clearFlowSession(conversationId);
    return false;
  }

  const steps       = parseSteps(flow.steps);
  const waitingStep = steps[state.stepIndex - 1];

  if (waitingStep?.type === "collect_input" && waitingStep.inputKey) {
    state.collectedValues[waitingStep.inputKey] = incomingText;
  }

  await runStepsFrom(state, steps, conversationId);
  return true;
}
