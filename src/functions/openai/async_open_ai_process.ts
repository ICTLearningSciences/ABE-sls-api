/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
// Note: had to add .js to find this file in serverless
import { useWithOpenAI } from '../../hooks/use-with-open-ai.js';
import { DynamoDBStreamEvent } from 'aws-lambda';
import { OpenAiAsyncJobStatus } from '../../types.js';
import { DynamoDB, UpdateItemCommandInput } from '@aws-sdk/client-dynamodb';
import requireEnv from '../../helpers.js';
import { wrapHandler } from '../../sentry-helpers.js';
import { ExtractedOpenAiRequestData } from './helpers.js';

const jobsTableName = requireEnv('JOBS_TABLE_NAME');

// modern module syntax
export const handler = wrapHandler(async (event: DynamoDBStreamEvent) => {
  const records = event.Records.filter(
    (record) => record.eventName === 'INSERT' && record.dynamodb?.NewImage
  );
  for (let record of records) {
    const newImage = record.dynamodb?.NewImage;
    const openAiRequestData: ExtractedOpenAiRequestData = JSON.parse(
      newImage?.openAiRequestData.S || ''
    );
    const jobId = newImage?.id?.S;
    if (!openAiRequestData || !jobId) {
      console.error('openAiRequestData/jobId not found in dynamo db record');
      continue;
    }
    const {
      docsId,
      userId,
      systemPrompt,
      openAiModel,
      openAiPromptSteps,
      authHeaders,
    } = openAiRequestData;
    const { asyncAskAboutGDoc } = useWithOpenAI();
    const dynamoDbClient = new DynamoDB({ region: 'us-east-1' });
    try {
      const openAiResponse = await asyncAskAboutGDoc(
        docsId,
        userId,
        openAiPromptSteps,
        systemPrompt,
        authHeaders,
        openAiModel,
        jobId
      );
      // Update the job in dynamo db
      const tableRequest: UpdateItemCommandInput = {
        TableName: jobsTableName,
        Key: {
          id: {
            S: jobId,
          },
        },
        UpdateExpression:
          'set openAiResponse = :openAiResponse, job_status = :job_status, answer = :answer',
        ExpressionAttributeValues: {
          ':openAiResponse': {
            S: JSON.stringify(openAiResponse),
          },
          ':job_status': {
            S: OpenAiAsyncJobStatus.COMPLETE,
          },
          ':answer': {
            S: openAiResponse.answer,
          },
        },
      };
      await dynamoDbClient
        .updateItem(tableRequest)
        .catch((err) => {
          console.error(err);
        })
        .then(() => {
          console.log('Updated dynamo db record');
        });
    } catch (err) {
      console.error(err);

      const failedRequest: UpdateItemCommandInput = {
        TableName: jobsTableName,
        Key: {
          id: {
            S: jobId,
          },
        },
        UpdateExpression: 'set job_status = :job_status',
        ExpressionAttributeValues: {
          ':job_status': {
            S: OpenAiAsyncJobStatus.FAILED,
          },
        },
      };
      await dynamoDbClient.updateItem(failedRequest).catch((err) => {
        console.error(err);
        throw err;
      });
    }
  }
});
