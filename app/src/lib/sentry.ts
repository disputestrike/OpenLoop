/**
 * Sentry error tracking and monitoring
 * Captures exceptions, logs, and performance metrics
 */

import * as Sentry from "@sentry/nextjs";

/**
 * Initialize Sentry for error tracking and performance monitoring
 * Call once on application startup
 */
export function initSentry() {
  if (!process.env.SENTRY_DSN) {
    console.warn("[Sentry] SENTRY_DSN not set, error tracking disabled");
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.OnUncaughtException(),
      new Sentry.Integrations.OnUnhandledRejection(),
    ],

    // Release tracking
    release: process.env.COMMIT_SHA || "unknown",

    // Debug mode
    debug: process.env.NODE_ENV === "development",

    // Ignored errors (don't send to Sentry)
    ignoreErrors: [
      // Browser extensions
      "top.GLOBALS",
      // Network timeouts (expected in some cases)
      "NetworkError",
      // User cancelled
      "AbortError",
    ],

    // Deny URLs (don't send if from these origins)
    denyUrls: [
      // Browser extensions
      /extensions\//i,
      /^chrome:\/\//i,
    ],
  });

  console.log("[Sentry] Error tracking initialized");
}

/**
 * Capture an exception with custom context
 */
export function captureException(
  error: unknown,
  context?: Record<string, any>,
  level: "fatal" | "error" | "warning" | "info" = "error"
) {
  Sentry.captureException(error, {
    level,
    contexts: context ? { custom: context } : undefined,
    tags: {
      timestamp: new Date().toISOString(),
    },
  });

  // Also log to console in development
  if (process.env.NODE_ENV === "development") {
    console.error("[Sentry]", error, context);
  }
}

/**
 * Capture a message (non-error log)
 */
export function captureMessage(
  message: string,
  level: "fatal" | "error" | "warning" | "info" | "debug" = "info",
  context?: Record<string, any>
) {
  Sentry.captureMessage(message, {
    level,
    contexts: context ? { custom: context } : undefined,
  });
}

/**
 * Set user context for better error tracking
 */
export function setSentryUser(userId: string, email?: string, username?: string) {
  Sentry.setUser({
    id: userId,
    email,
    username,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, any>,
  level: "fatal" | "error" | "warning" | "info" | "debug" = "info"
) {
  Sentry.captureMessage(message, {
    level,
    contexts: {
      breadcrumb: {
        category,
        data,
        timestamp: Date.now(),
      },
    },
  });
}

/**
 * Wrap async function with error tracking
 */
export function withErrorTracking<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: Record<string, any>
): (...args: T) => Promise<R> {
  return async (...args: T) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureException(error, context);
      throw error;
    }
  };
}

/**
 * Structured logging with context
 */
export class Logger {
  constructor(private namespace: string) {}

  info(message: string, context?: Record<string, any>) {
    console.log(`[${this.namespace}] ${message}`, context);
    captureMessage(message, "info", { ...context, namespace: this.namespace });
  }

  warn(message: string, context?: Record<string, any>) {
    console.warn(`[${this.namespace}] ${message}`, context);
    captureMessage(message, "warning", { ...context, namespace: this.namespace });
  }

  error(message: string, error?: unknown, context?: Record<string, any>) {
    console.error(`[${this.namespace}] ${message}`, error, context);
    captureException(error || new Error(message), {
      ...context,
      namespace: this.namespace,
    });
  }

  debug(message: string, context?: Record<string, any>) {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[${this.namespace}] ${message}`, context);
    }
  }
}

// Export pre-configured logger factory
export function createLogger(namespace: string): Logger {
  return new Logger(namespace);
}
