import { UpdateItemCommandInput } from "@aws-sdk/client-dynamodb";
import { AiAsyncJobStatus } from "../../types.js";
import { DocumentDBManager } from "../generic_classes/document_db_manager.js";
import { GQLDocumentTimeline } from "../../functions/timeline/functions/types.js";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import requireEnv from "../../helpers.js";

export class DynamoDBManager extends DocumentDBManager {
    private readonly jobsTableName = requireEnv('JOBS_TABLE_NAME');
    private readonly dynamoDbClient = new DynamoDB({ region: 'us-east-1' });

    constructor() {
        super();
    }

    async updateJobStatus(jobId: string, jobStatus: AiAsyncJobStatus): Promise<void> {
        const tableRequest: UpdateItemCommandInput = {
            TableName: this.jobsTableName,
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
          await this.dynamoDbClient
            .updateItem(tableRequest)
            .catch((err) => {
              console.error(err);
              throw err;
            })
            .then(() => {
              console.log('Updated dynamo db record status');
            });
    }

    async storeDoctimeline(jobId: string, docTimeline: GQLDocumentTimeline, jobStatus: AiAsyncJobStatus): Promise<void> {
        const tableRequest: UpdateItemCommandInput = {
            TableName: this.jobsTableName,
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
          await this.dynamoDbClient
            .updateItem(tableRequest)
            .catch((err) => {
              console.error(err);
              throw err;
            })
            .then(() => {
              console.log('Updated dynamo db record');
            });
    }
}