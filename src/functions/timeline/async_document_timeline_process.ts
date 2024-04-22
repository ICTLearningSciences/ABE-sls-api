/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
// Note: had to add .js to find this file in serverless
import { DynamoDBStreamEvent } from 'aws-lambda';
import { OpenAiAsyncJobStatus } from '../../types.js';
import { DynamoDB, UpdateItemCommandInput } from '@aws-sdk/client-dynamodb';
import requireEnv from '../../helpers.js';
import { useWithGetDocumentTimeline } from './use-with-get-document-timeline.js';
import { useWithGoogleApi } from '../../hooks/google_api.js';
import { wrapHandler } from '../../sentry-helpers.js';

const jobsTableName = requireEnv('JOBS_TABLE_NAME');

interface ExtractedDocumentTimelineRequestData {
  docId: string;
  userId: string;
}

// modern module syntax
export const handler = wrapHandler(async (event: DynamoDBStreamEvent) => {
  const records = event.Records.filter(
    (record) => record.eventName === 'INSERT' && record.dynamodb?.NewImage
  );
  for (let record of records) {
    const newImage = record.dynamodb?.NewImage;
    const requestData = newImage?.timelineRequestData.S;
    const docTimelineRequestData:
      | ExtractedDocumentTimelineRequestData
      | undefined = requestData ? JSON.parse(requestData) : undefined;
    const jobId = newImage?.id?.S;
    if (!docTimelineRequestData || !jobId) {
      console.error(
        'docTimelineRequestData/jobId not found in dynamo db record'
      );
      continue;
    }
    const dynamoDbClient = new DynamoDB({ region: 'us-east-1' });
    try {
      const { docId, userId } = docTimelineRequestData;
      const { getGoogleAPIs, getGoogleDocVersions } = useWithGoogleApi();
      const { drive, docs, accessToken: _accessToken } = await getGoogleAPIs();
      const accessToken = _accessToken || '';
      const externalGoogleDocRevisions = await getGoogleDocVersions(
        drive,
        docId,
        accessToken
      );
      const { getDocumentTimeline } = useWithGetDocumentTimeline();
      // Don't need to return anything, just need to process the async request.
      const documentTimelineRes = await getDocumentTimeline(
        userId,
        docId,
        externalGoogleDocRevisions,
        accessToken
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
          'set documentTimeline = :documentTimeline, job_status = :job_status',
        ExpressionAttributeValues: {
          ':documentTimeline': {
            S: JSON.stringify(documentTimelineRes),
          },
          ':job_status': {
            S: OpenAiAsyncJobStatus.COMPLETE,
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
      throw err;
    }
  }
});
