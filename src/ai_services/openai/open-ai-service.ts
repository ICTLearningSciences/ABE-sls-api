/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import OpenAI from 'openai';
import {
  AiRequestContext,
  GptModels,
  PromptOutputTypes,
  PromptRoles,
} from '../../types.js';
import { AiService } from '../abstract-classes/abstract-ai-service.js';
import { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/index.js';
import { v4 as uuid } from 'uuid';
import { Schema } from 'jsonschema';
import { isJsonString, validateJsonResponse } from '../../helpers.js';
import { AI_DEFAULT_TEMP, RETRY_ATTEMPTS } from '../../constants.js';
import {
  AiServiceResponse,
  AiStepData,
} from '../../ai_services/ai-service-types.js';

export const DefaultOpenAiConfig = {
  DEFAULT_SYSTEM_ROLE:
    'You are ChatGPT, a large language model trained by OpenAI, based on the GPT-3.5 architecture. Knowledge cutoff: 2021-09.',
  DEFAULT_GPT_MODEL: GptModels.OPEN_AI_GPT_3_5,
};

export type OpenAiReqType = ChatCompletionCreateParamsNonStreaming;
export type OpenAiResType = OpenAI.Chat.Completions.ChatCompletion.Choice[];

export type OpenAiStepDataType = AiStepData<OpenAiReqType, OpenAiResType>;
export type OpenAiPromptResponse = AiServiceResponse<
  OpenAiReqType,
  OpenAiResType
>;

export class OpenAiService extends AiService<OpenAiReqType, OpenAiResType> {
  private static instance: OpenAiService;
  openAiClient: OpenAI;

  constructor() {
    super('OpenAI');
    this.openAiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30 * 1000, // 30 seconds (default is 10 minutes)
    });
  }

  static getInstance(): OpenAiService {
    if (!OpenAiService.instance) {
      OpenAiService.instance = new OpenAiService();
    }
    return OpenAiService.instance;
  }

  async executeAiUntilProperData(
    params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
    mustBeJson: boolean,
    jsonSchema?: Schema
  ): Promise<[OpenAI.Chat.Completions.ChatCompletion, string]> {
    let result = await this.executeOpenAi(params);
    let answer = result.choices[0].message.content || '';
    if (mustBeJson) {
      const checkJson = (answer: string) => {
        if (jsonSchema) {
          return validateJsonResponse(answer, jsonSchema);
        } else {
          return isJsonString(answer);
        }
      };
      let isJsonResponse = checkJson(answer);
      if (!isJsonResponse) {
        for (let j = 0; j < RETRY_ATTEMPTS; j++) {
          console.log(`Attempt ${j}`);
          if (isJsonResponse) {
            break;
          }
          const newParams: OpenAI.Chat.Completions.ChatCompletionCreateParams =
            {
              ...params,
              temperature: AI_DEFAULT_TEMP + j * 0.1,
            };
          result = await this.executeOpenAi(newParams);
          answer = result.choices[0].message.content || '';
          if (!answer) {
            throw new Error('OpenAI API Error: No response message content.');
          }
          isJsonResponse = checkJson(answer);
        }
      }
      if (!isJsonResponse) {
        throw new Error(
          `OpenAI API Error: No valid JSON response after ${RETRY_ATTEMPTS} attempts.`
        );
      }
    }
    return [result, answer || ''];
  }

  async executeOpenAi(params: ChatCompletionCreateParamsNonStreaming) {
    let id = uuid();
    console.log(
      `Executing OpenAI request ${id} starting at ${new Date().toISOString()}`
    );
    const result = await this.openAiClient.chat.completions.create(params);
    if (!result.choices.length) {
      throw new Error('OpenAI API Error: No choices provided.');
    }
    const answer = result.choices[0].message.content;
    if (!answer) {
      throw new Error('OpenAI API Error: No response message content.');
    }
    console.log(
      `Executing OpenAI request ${id} ending at ${new Date().toISOString()}`
    );
    return result;
  }

  convertContextDataToServiceParams(
    requestContext: AiRequestContext,
    overrideModel?: GptModels
  ): ChatCompletionCreateParamsNonStreaming {
    const { aiStep, docsPlainText, systemRole, previousOutput } =
      requestContext;
    const request: ChatCompletionCreateParamsNonStreaming = {
      messages: [],
      model:
        overrideModel ||
        aiStep.targetGptModel ||
        DefaultOpenAiConfig.DEFAULT_GPT_MODEL,
    };
    request.messages.push({
      role: PromptRoles.SYSTEM,
      content: aiStep.customSystemRole || systemRole || DefaultOpenAiConfig.DEFAULT_SYSTEM_ROLE,
    });
    if (previousOutput) {
      request.messages.push({
        role: PromptRoles.ASSISSANT,
        content: `Here is the previous output: ---------- \n\n ${previousOutput}`,
      });
    }
    aiStep.prompts.forEach((prompt) => {
      let text = prompt.promptText;
      if (prompt.includeEssay) {
        text += `\n\nHere is the users essay: -----------\n\n${docsPlainText}`;
      }
      request.messages.push({
        role: prompt.promptRole || PromptRoles.USER,
        content: text,
      });
    });

    return request;
  }

  async completeChat(
    context: AiRequestContext,
    overrideModel?: GptModels
  ): Promise<OpenAiPromptResponse> {
    const params = this.convertContextDataToServiceParams(
      context,
      overrideModel
    );
    const [chatCompleteResponse, answer] = await this.executeAiUntilProperData(
      params,
      context.aiStep.outputDataType == PromptOutputTypes.JSON,
      context.aiStep.responseSchema
    );

    return {
      aiStepData: {
        aiServiceRequestParams: params,
        aiServiceResponse: chatCompleteResponse.choices,
      },
      answer: answer,
    };
  }
}
