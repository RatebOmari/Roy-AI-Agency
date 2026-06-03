import * as Sentry from "@sentry/react";

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Capture 10% of sessions in production for performance monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    // Record user sessions on errors
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: import.meta.env.PROD ? 0.05 : 0,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Don't track demo/dev sessions
    beforeSend(event) {
      if (import.meta.env.DEV) return null;
      return event;
    },
  });
}

export { Sentry };
