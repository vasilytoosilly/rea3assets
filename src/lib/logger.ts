// ---------------------------------------------------------------------------
// Structured JSON Logger
// ---------------------------------------------------------------------------
//
// Lightweight structured logger that outputs JSON to stdout/stderr.
// No external dependencies — works in both Edge (middleware) and Node.js runtimes.
//
// Usage:
//   import { logger } from "@/lib/logger";
//   logger.info("Asset created", { assetId: "abc-123", type: "character-model" });
//   logger.warn("Rate limit approaching", { path: "/api/assets", threshold: 100 });
//   logger.error("Upload failed", { error: err.message, assetId: "abc-123" });

type LogLevel = "info" | "warn" | "error";

/**
 * Shape of every log line emitted by this logger.
 * Serialised as a single JSON line — compatible with Logstash, CloudWatch, etc.
 */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  /** Arbitrary structured metadata attached to the log entry. */
  context: Record<string, unknown>;
}

/**
 * Write a structured JSON log line to the appropriate output stream.
 */
function writeLog(level: LogLevel, message: string, context: Record<string, unknown>): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  };

  const line = JSON.stringify(entry);

  switch (level) {
    case "error":
      // eslint-disable-next-line no-console -- logger is the designated console output channel
      console.error(line);
      break;
    case "warn":
      // eslint-disable-next-line no-console -- logger is the designated console output channel
      console.warn(line);
      break;
    default:
      // eslint-disable-next-line no-console -- logger is the designated console output channel
      console.log(line);
      break;
  }
}

/**
 * Structured JSON logger.
 *
 * Methods accept a message string and an optional context object containing
 * structured metadata relevant to the log event.
 */
export const logger = {
  info(message: string, context: Record<string, unknown> = {}): void {
    writeLog("info", message, context);
  },

  warn(message: string, context: Record<string, unknown> = {}): void {
    writeLog("warn", message, context);
  },

  error(message: string, context: Record<string, unknown> = {}): void {
    writeLog("error", message, context);
  },
};
