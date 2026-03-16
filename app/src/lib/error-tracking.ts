/**
 * ERROR TRACKING & LOGGING
 * Works with or without Sentry
 * Provides structured logging, error context, and breadcrumbs
 */

export interface ErrorContext {
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  namespace: string;
  message: string;
  context?: ErrorContext;
  stack?: string;
}

// In-memory log buffer (for dev/testing, replace with proper log service in prod)
const logBuffer: LogEntry[] = [];
const MAX_LOG_BUFFER = 1000;

/**
 * Internal logging function - collects logs for later export
 */
function addLog(entry: LogEntry) {
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOG_BUFFER) {
    logBuffer.shift();
  }

  // Also log to console in development
  const methodName = (["log", "warn", "error", "info", "debug"].includes(entry.level) ? entry.level : "log") as "log" | "warn" | "error" | "info" | "debug";
  const consoleMethod = console[methodName];
  if (typeof consoleMethod === "function") {
    (consoleMethod as (...args: unknown[]) => void)(`[${entry.namespace}] ${entry.message}`, entry.context || "");
  }
}

/**
 * Get all buffered logs
 */
export function getLogs(): LogEntry[] {
  return [...logBuffer];
}

/**
 * Clear log buffer
 */
export function clearLogs() {
  logBuffer.length = 0;
}

/**
 * Structured logger with context
 */
export class StructuredLogger {
  constructor(private namespace: string) {}

  debug(message: string, context?: ErrorContext) {
    addLog({
      timestamp: new Date().toISOString(),
      level: 'debug',
      namespace: this.namespace,
      message,
      context,
    });
  }

  info(message: string, context?: ErrorContext) {
    addLog({
      timestamp: new Date().toISOString(),
      level: 'info',
      namespace: this.namespace,
      message,
      context,
    });
  }

  warn(message: string, context?: ErrorContext) {
    addLog({
      timestamp: new Date().toISOString(),
      level: 'warn',
      namespace: this.namespace,
      message,
      context,
    });
  }

  error(message: string, error?: unknown, context?: ErrorContext) {
    const stack = error instanceof Error ? error.stack : undefined;
    const errorMessage = error instanceof Error ? error.message : String(error);

    addLog({
      timestamp: new Date().toISOString(),
      level: 'error',
      namespace: this.namespace,
      message,
      context: {
        ...context,
        error: errorMessage,
      },
      stack,
    });

    // Try to send to Sentry if available
    if (typeof window !== "undefined" && (window as Window & { __SENTRY_AVAILABLE__?: boolean }).__SENTRY_AVAILABLE__) {
      try {
        // Sentry integration point (if available)
        const Sentry = (globalThis as { __SENTRY__?: { captureException?: (err: unknown, opts?: unknown) => void } }).__SENTRY__;
        if (Sentry?.captureException) {
          Sentry.captureException(error || new Error(message), {
            contexts: {
              logger: {
                namespace: this.namespace,
                message,
              },
              custom: context,
            },
          });
        }
      } catch (sentryErr) {
        // Silent fail - Sentry not available
      }
    }
  }
}

/**
 * Create a logger instance
 */
export function createLogger(namespace: string): StructuredLogger {
  return new StructuredLogger(namespace);
}

/**
 * Global error handler registration
 */
export function setupGlobalErrorHandling() {
  const logger = createLogger('global-error-handler');

  // Handle uncaught exceptions
  if (typeof globalThis !== 'undefined') {
    if (typeof process !== 'undefined' && process.on) {
      process.on('uncaughtException', (error: Error) => {
        logger.error('Uncaught exception', error, {
          type: 'uncaughtException',
        });
      });

      process.on('unhandledRejection', (reason: unknown) => {
        logger.error('Unhandled rejection', reason as Error, {
          type: 'unhandledRejection',
        });
      });
    }
  }
}

/**
 * Wrap async functions with error logging
 */
export function withErrorLogging<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: {
    namespace?: string;
    context?: ErrorContext;
  }
): T {
  const namespace = options?.namespace || fn.name || 'wrapped-function';
  const logger = createLogger(namespace);

  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      logger.error(
        `Function failed: ${namespace}`,
        error,
        {
          ...options?.context,
          args: args.map(a => (typeof a === 'object' ? '[Object]' : String(a))),
        }
      );
      throw error;
    }
  }) as T;
}

/**
 * Breadcrumb tracking for debugging
 */
export class BreadcrumbTracker {
  private breadcrumbs: Array<{
    category: string;
    message: string;
    timestamp: string;
    data?: unknown;
  }> = [];

  constructor(private maxBreadcrumbs: number = 50) {}

  add(category: string, message: string, data?: unknown) {
    this.breadcrumbs.push({
      category,
      message,
      timestamp: new Date().toISOString(),
      data,
    });

    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  get() {
    return [...this.breadcrumbs];
  }

  clear() {
    this.breadcrumbs = [];
  }
}

// Global breadcrumb tracker
const globalBreadcrumbs = new BreadcrumbTracker();

/**
 * Get global breadcrumb tracker
 */
export function getBreadcrumbs() {
  return globalBreadcrumbs;
}

/**
 * Format error for API response
 */
export function formatErrorResponse(
  error: unknown,
  statusCode: number = 500,
  includeStack: boolean = false
) {
  const isDev = process.env.NODE_ENV === 'development';

  if (error instanceof Error) {
    return {
      error: error.message,
      status: statusCode,
      ...(isDev && includeStack && { stack: error.stack }),
    };
  }

  return {
    error: String(error) || 'Unknown error',
    status: statusCode,
  };
}

/**
 * Initialize error tracking on startup
 */
export function initializeErrorTracking() {
  setupGlobalErrorHandling();

  const logger = createLogger('error-tracking-init');
  logger.info('Error tracking initialized', {
    environment: process.env.NODE_ENV,
    sentryEnabled: !!process.env.SENTRY_DSN,
  });
}
