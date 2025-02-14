/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { TimelineRequestData } from '../../shared_functions/timeline/async_document_timeline_request.js';
import { GenericLlmRequest } from '../../generic_llm_request/helpers.js';
import { ExtractedOpenAiRequestData } from '../../shared_functions/ai_steps_request/helpers.js';
import {
  DocumentDBManager,
  GenericStatusRes,
  StepStatusRes,
  TimelineStatusRes,
} from '../generic_classes/document_db/document_db.js';
import { CloudServices } from '../generic_classes/types.js';
import { AiServiceFinalResponseType } from '../../ai_services/ai-service-factory.js';
import { GQLDocumentTimeline } from '../../timeline-generation/types.js';
export class CosmosDBManager extends DocumentDBManager {
  cloudService: CloudServices = CloudServices.AZURE;

  constructor() {
    super();
  }

  async newStepsRequest(
    jobId: string,
    openAiRequestData: ExtractedOpenAiRequestData
  ): Promise<void> {
    throw new Error('Not implemented');
  }

  async stepsStatusRequest(jobId: string): Promise<StepStatusRes> {
    throw new Error('Not implemented');
  }

  async stepsProcessFinished(
    jobId: string,
    aiServiceResponse: AiServiceFinalResponseType
  ): Promise<void> {
    throw new Error('Not implemented');
  }

  async stepsProcessFailed(jobId: string, error: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async newGenericRequest(
    jobId: string,
    llmRequest: GenericLlmRequest
  ): Promise<void> {
    throw new Error('Not implemented');
  }

  async genericStatusRequest(jobId: string): Promise<GenericStatusRes> {
    throw new Error('Not implemented');
  }

  async genericProcessFinished(
    jobId: string,
    aiServiceResponse: AiServiceFinalResponseType
  ): Promise<void> {
    throw new Error('Not implemented');
  }

  async genericProcessFailed(jobId: string, error: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async newTimelineRequest(
    jobId: string,
    timelineRequestData: TimelineRequestData
  ): Promise<void> {
    throw new Error('Not implemented');
  }

  async timelineStatusRequest(jobId: string): Promise<TimelineStatusRes> {
    throw new Error('Not implemented');
  }

  async timelineProcessProgress(
    jobId: string,
    documentTimeline: GQLDocumentTimeline
  ): Promise<void> {
    throw new Error('Not implemented');
  }

  async timelineProcessFinished(
    jobId: string,
    documentTimeline: GQLDocumentTimeline
  ): Promise<void> {
    throw new Error('Not implemented');
  }

  async timelineProcessFailed(jobId: string, error: string): Promise<void> {
    throw new Error('Not implemented');
  }
}
