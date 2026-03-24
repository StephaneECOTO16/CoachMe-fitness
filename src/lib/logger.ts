/**
 * src/lib/logger.ts
 *
 * Structured logger for Next.js serverless environment.
 *
 * Why not Pino:
 *   Pino uses worker threads (via `thread-stream`) for async writes.
 *   Next.js 16 with Turbopack cannot resolve worker thread modules in
 *   the dev runtime, causing uncaught exceptions on every route compile.
 *   In a serverless context (Vercel), Pino's async worker performance
 *   benefit does not apply — each function invocation is short-lived.
 *
 * This logger:
 *   - Outputs structured JSON in production (compatible with Vercel log
 *     drain, Datadog, Logtail, and any other log aggregator)
 *   - Outputs readable formatted lines in development
 *   - Supports log levels: debug, info, warn, error
 *   - Redacts sensitive fields before serialisation
 *   - Zero dependencies, zero worker threads
 *   - Fully synchronous — safe in any Next.js runtime
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info({ userId: '...' }, 'User logged in');
 *   logger.error({ err, userId }, 'Failed to update profile');
 */

// ─── Types ────────────────────────────────────────────────────────────────────

type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

interface LogEntry {
  level: LogLevel;
  time: string;
  msg: string;
  [key: string]: unknown;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const IS_PROD = process.env.NODE_ENV === "production";
const IS_TEST = process.env.NODE_ENV === "test";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info:  1,
  warn:  2,
  error: 3,
};

// In production log info and above; in dev log debug and above
const MIN_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) ??
  (IS_PROD ? "info" : "debug");

// ─── Sensitive field redaction ────────────────────────────────────────────────

/**
 * Top-level keys that should never appear in logs.
 * Nested keys with these names are also redacted.
 */
const REDACTED_KEYS = new Set([
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "accessToken",
  "refreshToken",
  "apiKey",
  "privateKey",
]);

const REDACTED_PLACEHOLDER = "[REDACTED]";

/**
 * Recursively redacts sensitive keys from an object before logging.
 * Creates a shallow clone at each level so the original is never mutated.
 */
function redact(value: unknown, depth = 0): unknown {
  // Limit recursion depth to avoid hanging on circular structures
  if (depth > 5) return value;
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));

  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    result[k] = REDACTED_KEYS.has(k.toLowerCase()) ? REDACTED_PLACEHOLDER : redact(v, depth + 1);
  }
  return result;
}

/**
 * Safely serialises an Error instance into a plain object.
 * Native JSON.stringify() drops Error properties entirely.
 */
function serialiseError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      type: err.name,
      message: err.message,
      // Only include stack in non-production to avoid leaking internals
      ...(IS_PROD ? {} : { stack: err.stack }),
    };
  }
  return { message: String(err) };
}

// ─── Formatters ───────────────────────────────────────────────────────────────

/** ANSI colour codes — only used in dev */
const COLOURS: Record<LogLevel, string> = {
  debug: "\x1b[36m", // cyan
  info:  "\x1b[32m", // green
  warn:  "\x1b[33m", // yellow
  error: "\x1b[31m", // red
};
const RESET = "\x1b[0m";

/**
 * Formats a log entry as a human-readable line for development.
 * Example: 12:34:56 INFO  User logged in { userId: 'abc-123' }
 */
function formatDev(entry: LogEntry): string {
  const { level, time, msg, err, ...rest } = entry;
  const colour = COLOURS[level];
  const levelPadded = level.toUpperCase().padEnd(5);
  const timestamp = time.split("T")[1]?.replace("Z", "") ?? time;

  // Separate the error from other context for readable output
  const contextParts: string[] = [];
  if (err) contextParts.push(`\n  err: ${JSON.stringify(err, null, 2).replace(/\n/g, "\n  ")}`);
  const restKeys = Object.keys(rest);
  if (restKeys.length > 0) contextParts.push(JSON.stringify(rest));

  return `${colour}${timestamp} ${levelPadded}${RESET} ${msg}${
    contextParts.length > 0 ? " " + contextParts.join(" ") : ""
  }`;
}

/**
 * Formats a log entry as a single-line JSON string for production.
 * Log aggregators (Vercel, Datadog, Logtail) parse this automatically.
 */
function formatProd(entry: LogEntry): string {
  return JSON.stringify(entry);
}

// ─── Core write function ──────────────────────────────────────────────────────

function write(level: LogLevel, context: LogContext, msg: string): void {
  // Skip entries below the configured minimum level
  if (LOG_LEVELS[level] < LOG_LEVELS[MIN_LEVEL]) return;

  // Suppress all output during tests unless explicitly enabled
  if (IS_TEST && !process.env.LOG_IN_TESTS) return;

  // Serialise errors specially so they survive JSON.stringify
  const serialisedContext = Object.fromEntries(
    Object.entries(redact(context) as LogContext).map(([k, v]) => [
      k,
      v instanceof Error ? serialiseError(v) : v,
    ])
  );

  const entry: LogEntry = {
    level,
    time: new Date().toISOString(),
    msg,
    ...serialisedContext,
  };

  const line = IS_PROD ? formatProd(entry) : formatDev(entry);

  // Route to the appropriate console method so Vercel's log UI
  // correctly colours and categorises each level
  switch (level) {
    case "debug": console.debug(line); break;
    case "info":  console.info(line);  break;
    case "warn":  console.warn(line);  break;
    case "error": console.error(line); break;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const logger = {
  debug: (context: LogContext, msg: string) => write("debug", context, msg),
  info:  (context: LogContext, msg: string) => write("info",  context, msg),
  warn:  (context: LogContext, msg: string) => write("warn",  context, msg),
  error: (context: LogContext, msg: string) => write("error", context, msg),
};

/**
 * Creates a child logger with pre-bound context.
 * All entries from the child include the bound fields automatically.
 *
 * @example
 *   const log = requestLogger(crypto.randomUUID());
 *   log.info({}, 'Processing request');
 *   // → { requestId: 'abc-123', msg: 'Processing request', ... }
 */
export function requestLogger(requestId: string) {
  return {
    debug: (ctx: LogContext, msg: string) => write("debug", { requestId, ...ctx }, msg),
    info:  (ctx: LogContext, msg: string) => write("info",  { requestId, ...ctx }, msg),
    warn:  (ctx: LogContext, msg: string) => write("warn",  { requestId, ...ctx }, msg),
    error: (ctx: LogContext, msg: string) => write("error", { requestId, ...ctx }, msg),
  };
}

/**
 * Safely extracts a loggable error object from an unknown catch value.
 * Use this in catch blocks where the error type is unknown.
 *
 * @example
 *   } catch (err) {
 *     logger.error({ err: toLogError(err) }, 'Something failed');
 *   }
 */
export function toLogError(err: unknown): Record<string, unknown> {
  return serialiseError(err);
}
