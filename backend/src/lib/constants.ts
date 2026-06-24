/**
 * Shared constants for backend services.
 * Model names are centralised here so upgrading to a new Claude version
 * requires a single change rather than hunting across every route file.
 */

/** Fast, cost-effective model used for short-form reply generation. */
export const AI_FAST_MODEL = "claude-haiku-4-5-20251001";

/** Capable model used for complex generation tasks (content, summarisation). */
export const AI_DEFAULT_MODEL = "claude-haiku-4-5-20251001";
