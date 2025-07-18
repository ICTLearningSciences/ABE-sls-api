/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { MAX_OPEN_AI_CHAIN_REQUESTS } from '../constants.js';
import { AiPromptStep, DocServices, PromptOutputTypes } from '../types.js';
import { storePromptRun } from './graphql_api.js';
import { AuthHeaders } from '../shared_functions/ai_steps_request/helpers.js';
import {
  AiServiceFactory,
  AiServiceFinalResponseType,
  AiServiceStepDataTypes,
  AvailableAiServiceNames,
} from '../ai_services/ai-service-factory.js';
import { GenericLlmRequest } from '../generic_llm_request/helpers.js';
import { DocServiceFactory } from '../doc_services/doc-service-factory.js';
import { AiServiceModelConfigs } from '../gql_types.js';
import {
  EditDocResponse,
  editDocResponseSchema,
  getEditDocResponseFormat,
} from '../doc_services/helpers/edit-doc-helpers.js';

export class AiServiceHandler {
  constructor() {}

  /**
   * Handles multistep prompts which use the output of the previous prompt as the input for the next prompt.
   * Each individual prompt does not know what the previous prompt was.
   */
  async executeAiSteps(
    aiSteps: AiPromptStep[],
    docsId: string,
    userId: string,
    authHeaders: AuthHeaders,
    targetDocService: DocServices,
    llmModelConfigs: AiServiceModelConfigs[]
  ): Promise<AiServiceFinalResponseType> {
    if (aiSteps.length >= MAX_OPEN_AI_CHAIN_REQUESTS) {
      throw new Error(
        `Please limit the number of prompts to ${MAX_OPEN_AI_CHAIN_REQUESTS} or less`
      );
    }
    let finalAnswer = '';
    const docHandler = DocServiceFactory.getDocService(
      targetDocService,
      authHeaders
    );
    const allStepsData: AiServiceStepDataTypes[] = [];
    const docsContent = await docHandler.getDocData(docsId);
    const docsPlainText = docsContent.plainText;
    let previousOutput = '';
    for (let i = 0; i < aiSteps.length; i++) {
      const curAiStep = aiSteps[i];
      if (curAiStep.editDoc) {
        curAiStep.responseFormat = getEditDocResponseFormat();
        curAiStep.responseSchema = editDocResponseSchema;
      }
      const aiService = AiServiceFactory.getAiService(
        curAiStep.targetAiServiceModel.serviceName as AvailableAiServiceNames,
        llmModelConfigs
      );
      const res = await aiService.completeChat({
        aiStep: curAiStep,
        docsPlainText,
        previousOutput,
      });
      let { aiStepData, answer } = res;
      allStepsData.push(aiStepData);

      if (curAiStep.editDoc) {
        const editDocResponse = JSON.parse(answer) as EditDocResponse;
        await docHandler.handleDocEdits(docsId, editDocResponse.edits);
        answer = editDocResponse.responseMessage;
      }

      previousOutput = answer;
      finalAnswer = answer;
    }
    try {
      await storePromptRun(docsId, userId, aiSteps, allStepsData);
    } catch (err) {
      console.error('Failed to store prompt run in gql');
      console.log(err);
    } finally {
      return {
        aiAllStepsData: allStepsData,
        answer: finalAnswer,
      };
    }
  }

  async executeGenericLlmRequest(
    llmRequest: GenericLlmRequest,
    llmModelConfigs: AiServiceModelConfigs[]
  ): Promise<AiServiceFinalResponseType> {
    if (
      !Object.values(AvailableAiServiceNames).includes(
        llmRequest.targetAiServiceModel.serviceName as AvailableAiServiceNames
      )
    ) {
      throw new Error(
        `Invalid targetAiServiceModel.serviceName: ${llmRequest.targetAiServiceModel.serviceName}`
      );
    }
    const curAiStep: AiPromptStep = {
      prompts: llmRequest.prompts.map((prompt) => ({
        promptText: prompt.promptText,
        promptRole: prompt.promptRole,
        includeEssay: false,
      })),
      targetAiServiceModel: llmRequest.targetAiServiceModel,
      outputDataType: llmRequest.outputDataType,
      responseSchema: llmRequest.responseSchema,
      responseFormat: llmRequest.responseFormat,
      systemRole: llmRequest.systemRole,
    };
    const allStepsData: AiServiceStepDataTypes[] = [];
    const aiService = AiServiceFactory.getAiService(
      llmRequest.targetAiServiceModel.serviceName as AvailableAiServiceNames,
      llmModelConfigs
    );
    const res = await aiService.completeChat({
      aiStep: curAiStep,
      docsPlainText: '',
      previousOutput: '',
    });
    const { aiStepData, answer } = res;
    allStepsData.push(aiStepData);
    return {
      aiAllStepsData: allStepsData,
      answer: answer,
    };
  }
}
