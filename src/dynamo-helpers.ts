import { DynamoDB, UpdateItemCommandInput } from '@aws-sdk/client-dynamodb';
import { GQLDocumentTimeline } from './functions/timeline/types.js';
import requireEnv from './helpers.js';
import { OpenAiAsyncJobStatus } from './types.js';

const jobsTableName = requireEnv('JOBS_TABLE_NAME');
export const dynamoDbClient = new DynamoDB({ region: 'us-east-1' });

export async function updateDynamoJobStatus(
  jobId: string,
  jobStatus: OpenAiAsyncJobStatus
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
  jobStatus: OpenAiAsyncJobStatus
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
