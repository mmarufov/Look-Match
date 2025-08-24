// Lightweight Sentry placeholder. If SENTRY_DSN is set and @sentry/node is installed,
// initialize Sentry; otherwise no-op. This avoids adding a hard dependency.

let sentryReady = false;

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return; // no-op
  }

  try {
    // Dynamically require to avoid hard dependency if not installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require('@sentry/node');
    Sentry.init({ dsn, tracesSampleRate: 0.1 });
    // eslint-disable-next-line no-console
    console.log('Sentry initialized');
    sentryReady = true;
  } catch (_err) {
    // eslint-disable-next-line no-console
    console.warn('Sentry DSN provided but @sentry/node not installed. Skipping Sentry initialization.');
  }
}

export function captureException(err: unknown, context?: Record<string, any>): void {
  if (!sentryReady) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require('@sentry/node');
    if (context) Sentry.setContext('context', context);
    Sentry.captureException(err);
  } catch { /* noop */ }
}

export function captureMessage(message: string, context?: Record<string, any>): void {
  if (!sentryReady) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require('@sentry/node');
    if (context) Sentry.setContext('context', context);
    Sentry.captureMessage(message);
  } catch { /* noop */ }
}

export function withSentryBreadcrumb(fn: () => Promise<any>, breadcrumb: { category: string; message: string; data?: Record<string, any> }) {
  return async () => {
    if (sentryReady) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Sentry = require('@sentry/node');
        Sentry.addBreadcrumb({ category: breadcrumb.category, message: breadcrumb.message, data: breadcrumb.data });
      } catch { /* noop */ }
    }
    return fn();
  };
}


