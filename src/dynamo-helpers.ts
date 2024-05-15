/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { DynamoDB, UpdateItemCommandInput } from '@aws-sdk/client-dynamodb';
import { GQLDocumentTimeline } from './functions/timeline/types.js';
import requireEnv from './helpers.js';
import { AiAsyncJobStatus } from './types.js';

const jobsTableName = requireEnv('JOBS_TABLE_NAME');
export const dynamoDbClient = new DynamoDB({ region: 'us-east-1' });

export async function updateDynamoJobStatus(
  jobId: string,
  jobStatus: AiAsyncJobStatus
): Promise<void> {
  const tableRequest: UpdateItemCommandInput = {
    TableName: jobsTableName,
    Key: {
      id: {
        S: jobId,
      },
    },
    UpdateExpression: 'set job_status = :job_status',
    ExpressionAttributeValues: {
      ':job_status': {
        S: jobStatus,
      },
    },
  };
  await dynamoDbClient
    .updateItem(tableRequest)
    .catch((err) => {
      console.error(err);
      throw err;
    })
    .then(() => {
      console.log('Updated dynamo db record status');
    });
}

export async function storeDoctimelineDynamoDB(
  jobId: string,
  docTimeline: GQLDocumentTimeline,
  jobStatus: AiAsyncJobStatus
): Promise<void> {
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
        S: JSON.stringify(docTimeline),
      },
      ':job_status': {
        S: jobStatus,
      },
    },
  };
  await dynamoDbClient
    .updateItem(tableRequest)
    .catch((err) => {
      console.error(err);
      throw err;
    })
    .then(() => {
      console.log('Updated dynamo db record');
    });
}

export async function updateDynamoAnswer(answer: string, dynamoJobId: string) {
  const tableRequest: UpdateItemCommandInput = {
    TableName: jobsTableName,
    Key: {
      id: {
        S: dynamoJobId,
      },
    },
    UpdateExpression: 'set answer = :answer',
    ExpressionAttributeValues: {
      ':answer': {
        S: answer,
      },
    },
  };
  await dynamoDbClient.updateItem(tableRequest).catch((err) => {
    console.error(err);
  });
}
