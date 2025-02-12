/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { UpdateItemCommandInput, DynamoDB } from '@aws-sdk/client-dynamodb';
import { DocumentDBManager } from '../generic_classes/document_db_manager.js';
import requireEnv from '../../helpers.js';

export class DynamoDBManager extends DocumentDBManager {
  private readonly jobsTableName = requireEnv('JOBS_TABLE_NAME');
  private readonly dynamoDbClient = new DynamoDB({ region: 'us-east-1' });

  constructor() {
    super();
  }

  async storeNewItem(
    jobId: string,
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

  async updateExistingItem(
    jobId: string,
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
