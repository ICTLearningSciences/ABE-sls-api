/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

// Note: had to add .js to find this file in serverless
import { createResponseJson } from '../../helpers.js';
import { APIGatewayEvent } from 'aws-lambda';
import { wrapHandler } from '../../sentry-helpers.js';
import { genericRequestStatus } from 'abe-sls-core';
// modern module syntax
export const handler = wrapHandler(async (event: APIGatewayEvent) => {
  const jobId = event.queryStringParameters?.jobId;
  if (!jobId) {
    return createResponseJson(400, {
      response: { error: 'jobId query string parameter is required' },
    });
  }
  try { 
    const status = await genericRequestStatus(jobId);
    return createResponseJson(200, { response: {
      aiServiceResponse: status.aiServiceResponse,
      answer: status.answer,
      jobStatus: status.jobStatus,
      apiError: status.apiError,
    } });
  } catch (err) {
    console.error(err);
    return createResponseJson(500, {
      response: { error: `failed to get status for jobId: ${jobId}` },
    });
  }
});
