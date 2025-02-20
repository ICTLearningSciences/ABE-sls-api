/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { UpdateItemCommandInput, DynamoDB } from '@aws-sdk/client-dynamodb';
import {
  DocumentDBManager,
  GenericStatusRes,
  StepStatusRes,
  TimelineStatusRes,
} from '../generic_classes/document_db/document_db.js';
import requireEnv, { extractErrorMessageFromError } from '../../helpers.js';
import { CloudServices } from '../generic_classes/types.js';
import { AiAsyncJobStatus, DocServices } from '../../types.js';
import {
  AuthHeaders,
  ExtractedOpenAiRequestData,
} from '../../shared_functions/ai_steps_request/helpers.js';
import { AiServiceFinalResponseType } from '../../ai_services/ai-service-factory.js';
import { GenericLlmRequest } from '../../generic_llm_request/helpers.js';
import { TimelineRequestData } from '../../shared_functions/timeline/async_document_timeline_request.js';
import { GQLDocumentTimeline } from '../../timeline-generation/types.js';
export class DynamoDBManager extends DocumentDBManager {
  private readonly jobsTableName = requireEnv('JOBS_TABLE_NAME');
  dynamoDbClient: DynamoDB;
  cloudService: CloudServices = CloudServices.AWS;

  constructor() {
    super();
    this.dynamoDbClient = new DynamoDB({ region: 'us-east-1' });
  }

  async newStepsRequest(
    jobId: string,
    openAiRequestData: ExtractedOpenAiRequestData
  ): Promise<void> {
    const tableRequest = {
      TableName: this.jobsTableName,
      Item: {
        id: {
          S: jobId,
        },
        job_status: {
          S: AiAsyncJobStatus.QUEUED,
        },
        answer: {
          S: '',
        },
        aiServiceResponse: {
          S: '',
        },
        openAiRequestData: {
          S: JSON.stringify(openAiRequestData),
        },
      },
    };
    await this.dynamoDbClient.putItem(tableRequest);
  }

  async stepsStatusRequest(jobId: string): Promise<StepStatusRes> {
    const data = await this.dynamoDbClient.getItem({
      TableName: this.jobsTableName,
      Key: { id: { S: jobId } },
    });
    if (!data.Item) {
      throw new Error(`Job not found: ${jobId}`);
    }
    const jobStatus = data.Item.job_status.S;
    const _aiServiceResponse = data.Item.aiServiceResponse.S;
    const apiError = data?.Item?.api_error?.S || '';
    const answer = data.Item.answer.S || '';
    const aiServiceResponse: AiServiceFinalResponseType | null =
      _aiServiceResponse ? JSON.parse(_aiServiceResponse) : null;
    return {
      aiServiceResponse: aiServiceResponse || undefined,
      answer,
      jobStatus: jobStatus as AiAsyncJobStatus,
      apiError,
    };
  }

  async stepsProcessFinished(
    jobId: string,
    aiServiceResponse: AiServiceFinalResponseType
  ): Promise<void> {
    const tableRequest: UpdateItemCommandInput = {
      TableName: this.jobsTableName,
      Key: {
        id: {
          S: jobId,
        },
      },
      UpdateExpression:
        'set aiServiceResponse = :aiServiceResponse, job_status = :job_status, answer = :answer',
      ExpressionAttributeValues: {
        ':aiServiceResponse': {
          S: JSON.stringify(aiServiceResponse),
        },
        ':job_status': {
          S: AiAsyncJobStatus.COMPLETE,
        },
        ':answer': {
          S: aiServiceResponse.answer,
        },
      },
    };
    await this.dynamoDbClient.updateItem(tableRequest);
  }

  async stepsProcessFailed(jobId: string, error: string): Promise<void> {
    const failedRequest: UpdateItemCommandInput = {
      TableName: this.jobsTableName,
      Key: {
        id: {
          S: jobId,
        },
      },
      UpdateExpression: 'set job_status = :job_status, api_error = :api_error',
      ExpressionAttributeValues: {
        ':job_status': {
          S: AiAsyncJobStatus.FAILED,
        },
        ':api_error': {
          S: error,
        },
      },
    };
    await this.dynamoDbClient.updateItem(failedRequest);
  }

  async newGenericRequest(
    jobId: string,
    llmRequest: GenericLlmRequest
  ): Promise<void> {
    const tableRequest = {
      TableName: this.jobsTableName,
      Item: {
        id: {
          S: jobId,
        },
        job_status: {
          S: AiAsyncJobStatus.QUEUED,
        },
        answer: {
          S: '',
        },
        aiServiceResponse: {
          S: '',
        },
        requestData: {
          S: JSON.stringify({
            llmRequest,
          }),
        },
      },
    };
    await this.dynamoDbClient.putItem(tableRequest);
  }

  async genericStatusRequest(jobId: string): Promise<GenericStatusRes> {
    const data = await this.dynamoDbClient.getItem({
      TableName: this.jobsTableName,
      Key: { id: { S: jobId } },
    });
    if (!data.Item) {
      throw new Error(`Job not found: ${jobId}`);
    }
    const jobStatus = data.Item.job_status.S;
    const _aiServiceResponse = data.Item.aiServiceResponse.S;
    const apiError = data?.Item?.api_error?.S || '';
    const aiServiceResponse: AiServiceFinalResponseType | null =
      _aiServiceResponse ? JSON.parse(_aiServiceResponse) : null;
    return {
      aiServiceResponse: aiServiceResponse || undefined,
      answer: '',
      jobStatus: jobStatus as AiAsyncJobStatus,
      apiError,
    };
  }

  async genericProcessFinished(
    jobId: string,
    aiServiceResponse: AiServiceFinalResponseType
  ): Promise<void> {
    const tableRequest: UpdateItemCommandInput = {
      TableName: this.jobsTableName,
      Key: {
        id: {
          S: jobId,
        },
      },
      UpdateExpression:
        'set aiServiceResponse = :aiServiceResponse, job_status = :job_status, answer = :answer',
      ExpressionAttributeValues: {
        ':aiServiceResponse': {
          S: JSON.stringify(aiServiceResponse),
        },
        ':job_status': {
          S: AiAsyncJobStatus.COMPLETE,
        },
        ':answer': {
          S: aiServiceResponse.answer,
        },
      },
    };
    await this.dynamoDbClient.updateItem(tableRequest);
  }

  async genericProcessFailed(jobId: string, error: string): Promise<void> {
    const failedRequest: UpdateItemCommandInput = {
      TableName: this.jobsTableName,
      Key: {
        id: {
          S: jobId,
        },
      },
      UpdateExpression: 'set job_status = :job_status, api_error = :api_error',
      ExpressionAttributeValues: {
        ':job_status': {
          S: AiAsyncJobStatus.FAILED,
        },
        ':api_error': {
          S: error,
        },
      },
    };
    await this.dynamoDbClient.updateItem(failedRequest);
  }

  async newTimelineRequest(
    jobId: string,
    timelineRequestData: TimelineRequestData
  ): Promise<void> {
    const tableRequest = {
      TableName: this.jobsTableName,
      Item: {
        id: {
          S: jobId,
        },
        job_status: {
          S: AiAsyncJobStatus.QUEUED,
        },
        documentTimeline: {
          S: '',
        },
        timelineRequestData: {
          S: JSON.stringify(timelineRequestData),
        },
      },
    };
    await this.dynamoDbClient.putItem(tableRequest);
  }

  async timelineStatusRequest(jobId: string): Promise<TimelineStatusRes> {
    const data = await this.dynamoDbClient.getItem({
      TableName: this.jobsTableName,
      Key: { id: { S: jobId } },
    });
    if (!data.Item) {
      throw new Error(`Job not found: ${jobId}`);
    }
    const jobStatus = data.Item.job_status.S;
    const documentTimelineData = data.Item.documentTimeline.S;
    const documentTimeline: GQLDocumentTimeline = documentTimelineData
      ? JSON.parse(documentTimelineData)
      : null;
    return {
      documentTimeline,
      jobStatus: jobStatus as AiAsyncJobStatus,
    };
  }

  async timelineProcessProgress(
    jobId: string,
    documentTimeline: GQLDocumentTimeline
  ): Promise<void> {
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
          S: JSON.stringify(documentTimeline),
        },
        ':job_status': {
          S: AiAsyncJobStatus.IN_PROGRESS,
        },
      },
    };
    await this.dynamoDbClient.updateItem(tableRequest);
  }

  async timelineProcessFinished(
    jobId: string,
    documentTimeline: GQLDocumentTimeline
  ): Promise<void> {
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
          S: JSON.stringify(documentTimeline),
        },
        ':job_status': {
          S: AiAsyncJobStatus.COMPLETE,
        },
      },
    };
    await this.dynamoDbClient.updateItem(tableRequest);
  }

  async timelineProcessFailed(jobId: string, error: string): Promise<void> {
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
          S: AiAsyncJobStatus.FAILED,
        },
      },
    };
    await this.dynamoDbClient.updateItem(tableRequest);
  }

  async setJobInProgress(jobId: string): Promise<void> {
    const tableRequest: UpdateItemCommandInput = {
      TableName: this.jobsTableName,
      Key: { id: { S: jobId } },
      UpdateExpression: 'set job_status = :job_status',
      ExpressionAttributeValues: {
        ':job_status': {
          S: AiAsyncJobStatus.IN_PROGRESS,
        },
      },
    };
    await this.dynamoDbClient.updateItem(tableRequest);
  }
}
