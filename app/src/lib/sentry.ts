/**
 * Sentry error tracking and monitoring (optional)
 * Stub when @sentry/nextjs is not installed. Install @sentry/nextjs and set SENTRY_DSN to enable.
 */

export function initSentry() {
  if (!process.env.SENTRY_DSN) return;
  console.warn("[Sentry] @sentry/nextjs not installed; error tracking disabled");
}

export function captureException(
  _error: unknown,
  _context?: Record<string, unknown>,
  _level: "fatal" | "error" | "warning" | "info" = "error"
) {
  if (process.env.NODE_ENV === "development" && _error) {
    console.error("[Sentry]", _error, _context);
  }
}

export function captureMessage(
  _message: string,
  _level: "fatal" | "error" | "warning" | "info" | "debug" = "info",
  _context?: Record<string, unknown>
) {
  // no-op
}

export function setSentryUser(_userId: string, _email?: string, _username?: string) {
  // no-op
}

export function clearSentryUser() {
  // no-op
}

export function addBreadcrumb(
  _category: string,
  _message: string,
  _data?: Record<string, unknown>,
  _level: "fatal" | "error" | "warning" | "info" | "debug" = "info"
) {
  // no-op
}

export function withErrorTracking<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  _context?: Record<string, unknown>
): (...args: T) => Promise<R> {
  return fn;
}

export class Logger {
  constructor(private namespace: string) {}

  info(message: string, context?: Record<string, unknown>) {
    console.log(`[${this.namespace}] ${message}`, context ?? "");
  }

  warn(message: string, context?: Record<string, unknown>) {
    console.warn(`[${this.namespace}] ${message}`, context ?? "");
  }

  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    console.error(`[${this.namespace}] ${message}`, error, context ?? "");
  }

  debug(message: string, context?: Record<string, unknown>) {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[${this.namespace}] ${message}`, context ?? "");
    }
  }
}

export function createLogger(namespace: string): Logger {
  return new Logger(namespace);
}
