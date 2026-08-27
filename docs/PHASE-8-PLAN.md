# Phase 8 plan — unifying the two AI-reply pipelines

> Planning doc only. No code yet. Decide from this whether Phase 8 is worth the
> effort, and if so, which of the two scopes to take.

## The problem, quantified

The app moderates AI-drafted replies in **two parallel places** with divergent shapes:

| | Inbox (DMs) | Comments |
|---|---|---|
| Table | `messages` (per `conversation`) | `comments` (per user) |
| Route | `routes/conversations.ts` (541 lines) | `routes/comments.ts` (265 lines) |
| Moderation field | `messages.replyStatus` (`reply_status` enum) | `comments.status` (`reply_status` enum) |
| AI fields | `aiReply`, `aiConfidence` | `aiReply`, `aiConfidence` |
| Frontend | `Inbox.tsx` + `ConversationPane`/`MessageBubble` | `Comments.tsx` + `CommentCard` |
| Shared today | `ConfidenceBanner`, `deliverReply`, the `reply_status` enum | (same) |

The duplicated logic (verified in the code) is the **reply-generation + moderation core**, mirrored almost line-for-line in both `generate-reply` handlers:

- Build a prompt that asks Claude for `{ reply, confidence }` with the same 85/50 confidence guidance.
- Parse + clamp confidence, same fallback values (55, or 60–89 in demo mode).
- The **identical** 3-tier routing: `>=85 → auto_sent`, `>=50 → pending`, else `escalated`.
- Auto-deliver via `deliverReply` when `auto_sent`.

The only real differences: the inbox path adds `evaluateRules` (automation overrides) and uses `conversation.channel`; the comments path maps platform → channel via `platformToCommentChannel`.

**So the duplication is in the logic, not the data.** A `messages` row (a turn in a threaded DM, with `direction`/`sentBy`) and a `comments` row (a standalone public comment, with `platformCommentId`/`platformVideoId`) are genuinely different entities. That distinction matters for the recommendation.

## Two scopes for "unify"

### Scope A — unify the logic (recommended)

Extract the shared moderation core into one module; keep the two tables.

**New:** `lib/aiModeration.ts`
- `generateModeratedReply({ userId, text, channel, platform }) → { reply, confidence, replyStatus }`
  — owns the prompt, the Claude call, JSON parse/clamp, demo fallback, and the
  85/50 tiering. One definition of the thresholds instead of two.
- `deliverIfAutoSent(replyStatus, { channel, ... })` — the shared auto-deliver step.

**Changes:**
- `conversations.ts` generate-reply → calls the helper, then applies its
  `evaluateRules` override (stays inbox-specific).
- `comments.ts` generate-reply → calls the helper with the comment's channel.
- Frontend: optionally extract a shared `<ModeratableReply>` card that
  `MessageBubble` and `CommentCard` both use for the AI-reply + confidence +
  approve/reject/edit block (they already share `ConfidenceBanner`).

**Migration:** none. No schema change, no data movement.
**Risk:** low–medium (pure refactor, both paths verifiable by running generate-reply).
**Effort:** ~1 day.
**Payoff:** ~80% of the maintainability win — one place to change the tiering,
the prompt, and the delivery rule.

### Scope B — unify the data too (optional, higher risk)

Merge `messages` and `comments` into one table (or a shared parent), e.g. a
`moderation_items` table with a `source` discriminator (`dm` | `comment`) and
nullable source-specific columns (`convId`, `direction`, `sentBy` vs
`platformCommentId`, `platformVideoId`, `username`).

**Migration strategy (if pursued):**
1. New migration creates `moderation_items` with the union of columns.
2. Backfill: copy `messages` rows (source=`dm`) and `comments` rows
   (source=`comment`) into it, mapping `comments.status` → the shared
   `replyStatus`.
3. Dual-write for one deploy (write both old + new) to de-risk, OR cut over
   directly behind the migration.
4. Rewrite both routes + both frontends to read the unified table.
5. Drop `messages`/`comments` in a later migration once verified.

**Risk:** high — two live tables, a real backfill, and both the inbox and
comments UIs rewritten. Multi-day.
**Payoff:** removes the last structural duplication, but at real risk, and it
forces two genuinely-different entities into one table (nullable-column soup).

## Recommendation

**Do Scope A. Stop there unless there's a concrete reason for B.**

Scope A removes the actual pain (duplicated, drift-prone moderation logic) at low
risk and no data migration. Scope B's data merge is the classic case where
"deduplicate the tables" costs more than the duplication does — the two entities
differ enough that a unified table becomes a bag of nullable columns, and the
migration touches two live datasets and two core UIs for modest additional gain.

If the tables are ever merged, do it later as its own project with dual-write,
not folded into this cleanup.

## Rollout (Scope A)

1. Write `lib/aiModeration.ts`; add a unit-free smoke path (run generate-reply on
   both a conversation and a comment against the local Postgres + a stubbed AI
   key) to confirm identical behavior before and after.
2. Refactor `conversations.ts` and `comments.ts` to use it.
3. (Optional) extract the shared frontend reply card.
4. Verify by running both flows; no migration, so no DB risk.
5. Ship behind the normal PR.
