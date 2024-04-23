/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import * as Sentry from '@sentry/serverless';
import requireEnv from './helpers.js';

const sentryDsn = requireEnv('SENTRY_DSN');
const stage = requireEnv('STAGE');

Sentry.AWSLambda.init({
  dsn: sentryDsn,
  environment: stage,
  integrations: [],
  // Performance Monitoring
  tracesSampleRate: 0.2, //  Capture 20% of transactions
});

export function wrapHandler(handler: any) {
  if (stage === 'dev') return handler;
  return Sentry.AWSLambda.wrapHandler(async (event) => {
    return await handler(event);
  });
}

export default Sentry;
