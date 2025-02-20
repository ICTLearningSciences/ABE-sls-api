/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { TimelineRequestData } from '../../../shared_functions/timeline/async_document_timeline_request.js';
import { GenericLlmRequest } from '../../../generic_llm_request/helpers.js';
import { ExtractedOpenAiRequestData } from '../../../shared_functions/ai_steps_request/helpers.js';
import { AiAsyncJobStatus } from '../../../types.js';
import { CloudServices } from '../types.js';
import { AiServiceFinalResponseType } from '../../../ai_services/ai-service-factory.js';
import { GQLDocumentTimeline } from '../../../timeline-generation/types.js';

export interface JobStatusRes {
  aiServiceResponse: string;
  jobStatus: AiAsyncJobStatus;
  answer: string;
  apiError: string;
}

export interface DocumentDBGenericRequestItem {
  id: string;
  job_status?: AiAsyncJobStatus;
  answer?: string;
  aiServiceResponse?: string;
  requestData?: string;
  api_error?: string;
}

export interface DocumentDBStepsRequestItem {
  id: string;
  job_status?: AiAsyncJobStatus;
  answer?: string;
  aiServiceResponse?: string;
  openAiRequestData?: string;
  api_error?: string;
}

export interface DocumentDBTimelineRequestItem {
  id: string;
  job_status?: AiAsyncJobStatus;
  documentTimeline?: string;
  timelineRequestData?: string;
  api_error?: string;
}

export interface StepStatusRes {
  aiServiceResponse?: AiServiceFinalResponseType;
  answer: string;
  jobStatus: AiAsyncJobStatus;
  apiError: string;
}

export interface GenericStatusRes {
  aiServiceResponse?: AiServiceFinalResponseType;
  answer: string;
  jobStatus: AiAsyncJobStatus;
  apiError: string;
}

export interface TimelineStatusRes {
  documentTimeline: GQLDocumentTimeline;
  jobStatus: AiAsyncJobStatus;
}

export abstract class DocumentDBManager {
  protected static clientInstance: any = null;
  abstract cloudService: CloudServices;

  abstract setJobInProgress(jobId: string): Promise<void>;

  abstract newStepsRequest(
    jobId: string,
    openAiRequestData: ExtractedOpenAiRequestData
  ): Promise<void>;
  abstract stepsStatusRequest(jobId: string): Promise<StepStatusRes>;
  abstract stepsProcessFinished(
    jobId: string,
    aiServiceResponse: AiServiceFinalResponseType
  ): Promise<void>;
  abstract stepsProcessFailed(jobId: string, error: string): Promise<void>;

  abstract newGenericRequest(
    jobId: string,
    llmRequest: GenericLlmRequest
  ): Promise<void>;
  abstract genericStatusRequest(jobId: string): Promise<GenericStatusRes>;
  abstract genericProcessFinished(
    jobId: string,
    aiServiceResponse: AiServiceFinalResponseType
  ): Promise<void>;
  abstract genericProcessFailed(jobId: string, error: string): Promise<void>;

  abstract newTimelineRequest(
    jobId: string,
    timelineRequestData: TimelineRequestData
  ): Promise<void>;
  abstract timelineStatusRequest(jobId: string): Promise<TimelineStatusRes>;
  abstract timelineProcessProgress(
    jobId: string,
    documentTimeline: GQLDocumentTimeline
  ): Promise<void>;
  abstract timelineProcessFinished(
    jobId: string,
    documentTimeline: GQLDocumentTimeline
  ): Promise<void>;
  abstract timelineProcessFailed(jobId: string, error: string): Promise<void>;
}
