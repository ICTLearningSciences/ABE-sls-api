/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
// Note: had to add .js to find this file in serverless
import requireEnv, { createResponseJson } from '../../helpers.js';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { AiAsyncJobStatus } from '../../types.js';
import { APIGatewayEvent } from 'aws-lambda';
import { v4 as uuid } from 'uuid';
import { wrapHandler } from '../../sentry-helpers.js';

const jobsTableName = requireEnv('JOBS_TABLE_NAME');

// modern module syntax
export const handler = wrapHandler(async (event: APIGatewayEvent) => {
  const documentId = event.queryStringParameters?.['docId'];
  const userId = event.queryStringParameters?.['userId'];
  if (!documentId || !userId) {
    throw new Error('Missing required query parameters [docId, userId]');
  }
  // Queue the job
  const newUuid = uuid();
  // Store the job in dynamo db, triggers async lambda
  const dynamoDbClient = new DynamoDB({ region: 'us-east-1' });
  const tableRequest = {
    TableName: jobsTableName,
    Item: {
      id: {
        S: newUuid,
      },
      job_status: {
        S: AiAsyncJobStatus.IN_PROGRESS,
      },
      documentTimeline: {
        S: '',
      },
      timelineRequestData: {
        S: JSON.stringify({
          docId: documentId,
          userId,
        }),
      },
    },
  };
  try {
    await dynamoDbClient.putItem(tableRequest);
    return createResponseJson(200, { response: { jobId: newUuid } });
  } catch (err) {
    console.error(err);
    return createResponseJson(500, {
      response: { error: 'Failed to add job to dynamo db' },
    });
  }
});
