import { UpdateItemCommandInput, DynamoDB } from "@aws-sdk/client-dynamodb";
import { DocumentDBManager } from "../generic_classes/document_db_manager.js";
import requireEnv from "../../helpers.js";

export class DynamoDBManager extends DocumentDBManager {
    private readonly jobsTableName = requireEnv('JOBS_TABLE_NAME');
    private readonly dynamoDbClient = new DynamoDB({ region: 'us-east-1' });

    constructor() {
        super();
    }

    async storeNewItem(jobId: string,
        fields: Record<string, any>    
    ): Promise<void> {
        const tableRequest: any = {
            TableName: this.jobsTableName,
            Item: {
              id: {
                S: jobId,
              },
            },
          };
          Object.entries(fields).forEach(([key, value]) => {
            tableRequest.Item[key] = {
              S: value,
            };
          });
          await this.dynamoDbClient.putItem(tableRequest);
    }

    async updateExistingItem(jobId: string,
        fields: Record<string, any>    
    ): Promise<void> {
        const tableRequest: UpdateItemCommandInput = {
            TableName: this.jobsTableName,
            Key: {
                id: {
                    S: jobId,
                },
            },
            UpdateExpression: 'set',
            ExpressionAttributeValues: {},
        };
        Object.entries(fields).forEach(([key, value]) => {
            tableRequest.UpdateExpression += `, ${key} = :${key}`;
            tableRequest.ExpressionAttributeValues![`:${key}`] = {
                S: value,
            };
        });
        await this.dynamoDbClient.updateItem(tableRequest);
    }

    async getItem(jobId: string): Promise<any> {
        const data = await this.dynamoDbClient.getItem({
            TableName: this.jobsTableName,
            Key: { id: { S: jobId } },
          });
          if (!data.Item) {
            throw new Error(`Job not found: ${jobId}`);
          }
            const items = Object.entries(data.Item).map(([key, value]) => ({
                [key]: value.S,
            }));
          return items;
    }

}