/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { TimelineRequestData } from '../../shared_functions/timeline/async_document_timeline_request.js';
import { GenericLlmRequest } from '../../generic_llm_request/helpers.js';
import { ExtractedOpenAiRequestData } from '../../shared_functions/ai_steps_request/helpers.js';
import {
  DocumentDBGenericRequestItem,
  DocumentDBManager,
  DocumentDBStepsRequestItem,
  DocumentDBTimelineRequestItem,
  GenericStatusRes,
  StepStatusRes,
  TimelineStatusRes,
} from '../generic_classes/document_db/document_db.js';
import { CloudServices } from '../generic_classes/types.js';
import { AiServiceFinalResponseType } from '../../ai_services/ai-service-factory.js';
import {
  GQLDocumentTimeline,
  StoredDocumentTimeline,
} from '../../timeline-generation/types.js';
import requireEnv from '../../helpers.js';
import { CosmosClient } from '@azure/cosmos';
import { AiAsyncJobStatus } from '../../types.js';

export class CosmosDBManager extends DocumentDBManager {
  cloudService: CloudServices = CloudServices.AZURE;
  cosmosKey = requireEnv('COSMOS_KEY');
  cosmosEndpoint = requireEnv('CosmosDBEndpoint');
  cosmosDatabase = requireEnv('CosmosDBName');
  cosmosAiStepContainerName = requireEnv('CosmosDBAiStepContainerName');
  cosmosTimelineContainerName = requireEnv('CosmosDBTimelineContainerName');
  cosmosGenericRequestContainerName = requireEnv(
    'CosmosDBGenericRequestContainerName'
  );
  client = new CosmosClient({
    endpoint: this.cosmosEndpoint,
    key: this.cosmosKey,
  });
  database = this.client.database(this.cosmosDatabase);
  /**
   * Azure does not allow us to separate env vars for different functions,
   * so we have to explicitly specify the container name for each function.
   */
  aiStepContainer = this.database.container(this.cosmosAiStepContainerName);
  timelineContainer = this.database.container(this.cosmosTimelineContainerName);
  genericRequestContainer = this.database.container(
    this.cosmosGenericRequestContainerName
  );

  constructor() {
    super();
  }

  async newStepsRequest(
    jobId: string,
    openAiRequestData: ExtractedOpenAiRequestData
  ): Promise<void> {
    await this.aiStepContainer.items.upsert<DocumentDBStepsRequestItem>({
      id: jobId,
      job_status: AiAsyncJobStatus.QUEUED,
      answer: '',
      aiServiceResponse: '',
      openAiRequestData: JSON.stringify(openAiRequestData),
    });
  }

  async stepsStatusRequest(jobId: string): Promise<StepStatusRes> {
    const item = await this.aiStepContainer
      .item(jobId, jobId)
      .read<DocumentDBStepsRequestItem>();
    if (!item.resource) {
      throw new Error('Item not found for jobId: ' + jobId);
    }
    const jobStatus = item.resource?.job_status;
    const aiServiceResponse = item.resource?.aiServiceResponse
      ? JSON.parse(item.resource.aiServiceResponse)
      : undefined;
    const answer = item.resource?.answer;
    const apiError = item.resource?.api_error;
    return {
      jobStatus: jobStatus as AiAsyncJobStatus,
      aiServiceResponse: aiServiceResponse,
      answer: answer || '',
      apiError: apiError || '',
    };
  }

  async stepsProcessFinished(
    jobId: string,
    aiServiceResponse: AiServiceFinalResponseType
  ): Promise<void> {
    await this.aiStepContainer
      .item(jobId, jobId)
      .replace<DocumentDBStepsRequestItem>({
        id: jobId,
        job_status: AiAsyncJobStatus.COMPLETE,
        answer: aiServiceResponse.answer,
        aiServiceResponse: JSON.stringify(aiServiceResponse),
      });
  }

  async stepsProcessFailed(jobId: string, error: string): Promise<void> {
    await this.aiStepContainer
      .item(jobId, jobId)
      .replace<DocumentDBStepsRequestItem>({
        id: jobId,
        job_status: AiAsyncJobStatus.FAILED,
        api_error: error,
      });
  }

  async newGenericRequest(
    jobId: string,
    llmRequest: GenericLlmRequest
  ): Promise<void> {
    await this.genericRequestContainer.items.upsert<DocumentDBGenericRequestItem>(
      {
        id: jobId,
        job_status: AiAsyncJobStatus.QUEUED,
        answer: '',
        aiServiceResponse: '',
        requestData: JSON.stringify(llmRequest),
      }
    );
  }

  async genericStatusRequest(jobId: string): Promise<GenericStatusRes> {
    const item = await this.genericRequestContainer
      .item(jobId, jobId)
      .read<DocumentDBGenericRequestItem>();
    if (!item.resource) {
      throw new Error('Item not found for jobId: ' + jobId);
    }
    const jobStatus = item.resource?.job_status;
    const aiServiceResponse: AiServiceFinalResponseType | undefined = item
      .resource?.aiServiceResponse
      ? JSON.parse(item.resource.aiServiceResponse)
      : undefined;
    const answer = item.resource?.answer;
    const apiError = item.resource?.api_error;
    return {
      jobStatus: jobStatus as AiAsyncJobStatus,
      aiServiceResponse: aiServiceResponse,
      answer: answer || '',
      apiError: apiError || '',
    };
  }

  async genericProcessFinished(
    jobId: string,
    aiServiceResponse: AiServiceFinalResponseType
  ): Promise<void> {
    await this.genericRequestContainer
      .item(jobId, jobId)
      .replace<DocumentDBGenericRequestItem>({
        id: jobId,
        job_status: AiAsyncJobStatus.COMPLETE,
        answer: aiServiceResponse.answer,
        aiServiceResponse: JSON.stringify(aiServiceResponse),
      });
  }

  async genericProcessFailed(jobId: string, error: string): Promise<void> {
    await this.genericRequestContainer
      .item(jobId, jobId)
      .replace<DocumentDBGenericRequestItem>({
        id: jobId,
        job_status: AiAsyncJobStatus.FAILED,
        api_error: error,
      });
  }
  async newTimelineRequest(
    jobId: string,
    timelineRequestData: TimelineRequestData
  ): Promise<void> {
    await this.timelineContainer.items.upsert<DocumentDBTimelineRequestItem>({
      id: jobId,
      job_status: AiAsyncJobStatus.QUEUED,
      documentTimeline: '',
      timelineRequestData: JSON.stringify(timelineRequestData),
    });
  }

  async timelineStatusRequest(jobId: string): Promise<TimelineStatusRes> {
    const item = await this.timelineContainer
      .item(jobId, jobId)
      .read<DocumentDBTimelineRequestItem>();
    if (!item.resource) {
      throw new Error('Item not found for jobId: ' + jobId);
    }
    const jobStatus = item.resource?.job_status;
    const documentTimelineData = item.resource?.documentTimeline;
    const documentTimeline: StoredDocumentTimeline = documentTimelineData
      ? JSON.parse(documentTimelineData)
      : null;
    return {
      documentTimeline,
      jobStatus: jobStatus as AiAsyncJobStatus,
    };
  }

  async timelineProcessProgress(
    jobId: string,
    documentTimeline: StoredDocumentTimeline
  ): Promise<void> {
    await this.timelineContainer
      .item(jobId, jobId)
      .replace<DocumentDBTimelineRequestItem>({
        id: jobId,
        job_status: AiAsyncJobStatus.IN_PROGRESS,
        documentTimeline: JSON.stringify(documentTimeline),
      });
  }

  async timelineProcessFinished(
    jobId: string,
    documentTimeline: StoredDocumentTimeline
  ): Promise<void> {
    await this.timelineContainer
      .item(jobId, jobId)
      .replace<DocumentDBTimelineRequestItem>({
        id: jobId,
        job_status: AiAsyncJobStatus.COMPLETE,
        documentTimeline: JSON.stringify(documentTimeline),
      });
  }

  async timelineProcessFailed(jobId: string, error: string): Promise<void> {
    await this.timelineContainer
      .item(jobId, jobId)
      .replace<DocumentDBTimelineRequestItem>({
        id: jobId,
        job_status: AiAsyncJobStatus.FAILED,
        api_error: error,
      });
  }

  /**
   * Azure does not allow us to separate env vars for different functions,
   * so we have to explicitly specify the container name for each function.
   */
  async setStepsJobInProgress(jobId: string): Promise<void> {
    await this.aiStepContainer
      .item(jobId, jobId)
      .replace<DocumentDBStepsRequestItem>({
        id: jobId,
        job_status: AiAsyncJobStatus.IN_PROGRESS,
      });
  }

  async setGenericRequestJobInProgress(jobId: string): Promise<void> {
    await this.genericRequestContainer
      .item(jobId, jobId)
      .replace<DocumentDBGenericRequestItem>({
        id: jobId,
        job_status: AiAsyncJobStatus.IN_PROGRESS,
      });
  }

  async setTimelineJobInProgress(jobId: string): Promise<void> {
    await this.timelineContainer
      .item(jobId, jobId)
      .replace<DocumentDBTimelineRequestItem>({
        id: jobId,
        job_status: AiAsyncJobStatus.IN_PROGRESS,
      });
  }
}
