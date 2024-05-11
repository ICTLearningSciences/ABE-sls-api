/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { AiServicesPromptResponseTypes } from '../../ai_services/ai-service-factory.js';
import { AiRequestContext, GptModels } from '../../types.js';

/**
 * Response from OpenAI API
 */
export interface CompleteChatResponse<Req, Res> {
  reqParams: Req; // request parameters sent to AI service, stringified
  response: Res; // response from AI service, stringified
  answer: string; // primary answer from AI service
}

export abstract class AiService<Req, Res> {
  serviceName: string;
  approvedGptModels: GptModels[];
  abstract aiServiceClient: any;

  constructor(serviceName: string, approvedGptModels: GptModels[]) {
    this.serviceName = serviceName;
    this.approvedGptModels = approvedGptModels;
  }

  abstract convertContextDataToServiceParams(
    requestContext: AiRequestContext,
    overrideModel?: string
  ): any;

  isValidGptModel(model: string): boolean {
    return this.approvedGptModels.includes(model as GptModels);
  }

  abstract completeChat(
    context: AiRequestContext,
    overrideModel?: string
  ): Promise<AiServicesPromptResponseTypes>;
}
