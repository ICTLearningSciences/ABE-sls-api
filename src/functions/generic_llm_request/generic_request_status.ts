/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

// Note: had to add .js to find this file in serverless
import requireEnv, { createResponseJson } from '../../helpers.js';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { APIGatewayEvent } from 'aws-lambda';
import { wrapHandler } from '../../sentry-helpers.js';
import { AiServiceFinalResponseType } from '../../ai_services/ai-service-factory.js';

const jobsTableName = requireEnv('JOBS_TABLE_NAME');

// modern module syntax
export const handler = wrapHandler(async (event: APIGatewayEvent) => {
  const jobId = event.queryStringParameters?.jobId;
  if (!jobId) {
    return createResponseJson(400, {
      response: { error: 'jobId query string parameter is required' },
    });
  }
  // Queue the job
  // Store the job in dynamo db, triggers async lambda
  const dynamoDbClient = new DynamoDB({ region: 'us-east-1' });
  try {
    const data = await dynamoDbClient.getItem({
      TableName: jobsTableName,
      Key: { id: { S: jobId } },
    });
    if (!data.Item) {
      return createResponseJson(404, { response: { error: 'Job not found' } });
    }
    const jobStatus = data.Item.job_status.S;
    const _aiServiceResponse = data.Item.aiServiceResponse.S;
    const apiError = data?.Item?.api_error?.S || '';
    const aiServiceResponse: AiServiceFinalResponseType | null =
      _aiServiceResponse ? JSON.parse(_aiServiceResponse) : null;
    return createResponseJson(200, {
      response: {
        aiServiceResponse, 
        answer: aiServiceResponse?.answer || "",
        jobStatus,
        apiError,
      },
    });
  } catch (err) {
    console.error(err);
    return createResponseJson(500, {
      response: { error: `failed to get item from db for jobId: ${jobId}` },
    });
  }
});
