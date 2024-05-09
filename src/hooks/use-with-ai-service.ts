/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import {
  MAX_OPEN_AI_CHAIN_REQUESTS,
} from '../constants.js';
import { getDocData } from '../api.js';
import {
  OpenAiPromptResponse,
  OpenAiPromptStep,
  AvailableAiServices,
  PromptRoles,
  AiRequestContextPrompt,
  AiRequestContext,
  GptModels,
} from '../types.js';
import { storePromptRun } from './graphql_api.js';
import { AuthHeaders } from '../functions/openai/helpers.js';
import { OpenAiService } from '../ai_services/openai/open-ai-service.js';

const openAiService = OpenAiService.getInstance();

export function useWithAiService() {

  function convertDataToAiContext(
    openAiStep: OpenAiPromptStep,
    docsPlainText: string,
    previousOutput: string,
    systemRole: string
  ): AiRequestContext{
    const stepMessageContext: AiRequestContextPrompt[] = []
    if(previousOutput){
      stepMessageContext.push({
        promptText: previousOutput,
        promptRole: PromptRoles.ASSISSANT,
      });
    }

    openAiStep.prompts.forEach((prompt) => {
      let text = prompt.promptText;
      if(prompt.includeEssay){
        text += `\n\nHere is the users essay: -----------\n\n${docsPlainText}`
      }
      stepMessageContext.push({
        promptText: text,
        promptRole: prompt.promptRole || PromptRoles.USER,
      });
    })

    return{
      prompts: stepMessageContext,
      targetGptModel: openAiStep.targetGptModel,
      responseSchema: openAiStep.responseSchema,
      systemRole: openAiStep.customSystemRole || systemRole,
      outputDataType: openAiStep.outputDataType
    }

  }

  /**
   * Handles multistep prompts which use the output of the previous prompt as the input for the next prompt.
   * Each individual prompt does not know what the previous prompt was.
   */
  async function executeAiSteps(
    openAiSteps: OpenAiPromptStep[],
    docsId: string,
    userId: string,
    authHeaders: AuthHeaders,
    systemRole: string,
    targetGptModel: GptModels,
    aiService: AvailableAiServices
  ): Promise<OpenAiPromptResponse> {
    if (openAiSteps.length >= MAX_OPEN_AI_CHAIN_REQUESTS) {
      throw new Error(
        `Please limit the number of prompts to ${MAX_OPEN_AI_CHAIN_REQUESTS} or less`
      );
    }
    const openAiResponses: OpenAiPromptResponse = {
      openAiData: [],
      answer: '',
    };
    const docsContent = await getDocData(docsId, authHeaders);
    const docsPlainText = docsContent.plainText;
    let previousOutput = '';
    for (let i = 0; i < openAiSteps.length; i++) {
      const curOpenAiStep = openAiSteps[i];
      // TODO: context should already be setup here
      const aiRequestData = convertDataToAiContext(
        curOpenAiStep,
        docsPlainText,
        previousOutput,
        systemRole
      );

      // interface ExecutePromptSyncRes {
      //   reqRes: OpenAIReqRes;
      //   answer: string;
      // }

        const { reqRes, answer } = await openAiService.executeOpenAiPromptStep(
          curOpenAiStep,
          docsPlainText,
          systemRole,
          targetGptModel,
          previousOutput
        );
        openAiResponses.openAiData.push(reqRes);
        previousOutput = answer;
        openAiResponses.answer = answer;
    }
    try {
      await storePromptRun(
        docsId,
        userId,
        openAiSteps,
        openAiResponses.openAiData
      );
    } catch (err) {
      console.error('Failed to store prompt run in gql');
      console.log(err);
    } finally {
      return openAiResponses;
    }
  }

  return {
    executeAiSteps,
  };
}
