/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { MAX_OPEN_AI_CHAIN_REQUESTS } from '../constants.js';
import { getDocData } from '../api.js';
import { AiPromptStep, AvailableAiServices, GptModels } from '../types.js';
import { storePromptRun } from './graphql_api.js';
import { AuthHeaders } from '../functions/openai/helpers.js';
import { OpenAiService } from '../ai_services/openai/open-ai-service.js';
import {
  AiServiceFinalResponseType,
  AiServiceStepDataTypes,
} from '../ai_services/ai-service-types.js';
const openAiService = OpenAiService.getInstance();

export function useWithAiService() {
  /**
   * Handles multistep prompts which use the output of the previous prompt as the input for the next prompt.
   * Each individual prompt does not know what the previous prompt was.
   */
  async function executeAiSteps(
    aiSteps: AiPromptStep[],
    docsId: string,
    userId: string,
    authHeaders: AuthHeaders,
    systemRole: string,
    overrideGptModels: GptModels,
    aiService: AvailableAiServices
  ): Promise<AiServiceFinalResponseType> {
    if (aiSteps.length >= MAX_OPEN_AI_CHAIN_REQUESTS) {
      throw new Error(
        `Please limit the number of prompts to ${MAX_OPEN_AI_CHAIN_REQUESTS} or less`
      );
    }
    let finalAnswer = '';
    const allStepsData: AiServiceStepDataTypes[] = [];
    const docsContent = await getDocData(docsId, authHeaders);
    const docsPlainText = docsContent.plainText;
    let previousOutput = '';
    for (let i = 0; i < aiSteps.length; i++) {
      const curAiStep = aiSteps[i];
      const res = await openAiService.completeChat(
        {
          aiStep: curAiStep,
          docsPlainText,
          previousOutput,
          systemRole,
        },
        overrideGptModels
      );
      const { aiStepData, answer } = res;
      allStepsData.push({
        aiServiceRequestParams: aiStepData.aiServiceRequestParams,
        aiServiceResponse: aiStepData.aiServiceResponse,
      });
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

  return {
    executeAiSteps,
  };
}
