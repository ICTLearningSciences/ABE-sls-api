import * as Sentry from '@sentry/serverless';
import requireEnv from './helpers.js';

const sentryDsn = requireEnv('SENTRY_DSN');

Sentry.AWSLambda.init({
  dsn: sentryDsn,
  integrations: [],
  // Performance Monitoring
  tracesSampleRate: 0.2, //  Capture 20% of transactions
});

export function wrapHandler(handler: any) {
  return Sentry.AWSLambda.wrapHandler(async (event) => {
    return await handler(event);
  });
}
