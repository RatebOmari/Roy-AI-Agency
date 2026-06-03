import pino from "pino";

// Structured JSON logger. Set LOG_LEVEL env var to control verbosity (default "info").
// Pipe through pino-pretty for human-readable local output:
//   npx tsx src/server.ts | npx pino-pretty
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
});
