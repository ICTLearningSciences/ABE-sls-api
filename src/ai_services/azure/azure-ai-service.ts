/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { AiService } from '../../ai_services/abstract-classes/abstract-ai-service.js';
import {
  AiRequestContext,
  DefaultGptModels,
  PromptRoles,
} from '../../types.js';
import {
  OpenAIClient,
  AzureKeyCredential,
  ChatRequestMessageUnion,
  GetChatCompletionsOptions,
  ChatCompletions,
} from '@azure/openai';
import requireEnv, {
  isJsonString,
  validateJsonResponse,
} from '../../helpers.js';
import {
  AiServiceResponse,
  AiStepData,
  AvailableAiServiceNames,
} from '../../ai_services/ai-service-factory.js';
import { Schema } from 'jsonschema';
import { AI_DEFAULT_TEMP, RETRY_ATTEMPTS } from '../../constants.js';
import { v4 as uuid } from 'uuid';

// TODO
export interface AzureOpenAiReqType {
  deploymentName: string;
  messages: ChatRequestMessageUnion[];
  options?: GetChatCompletionsOptions;
}
export type AzureOpenAiResType = ChatCompletions;

export type AzureOpenAiStepDataType = AiStepData<
  AzureOpenAiReqType,
  AzureOpenAiResType
>;
export type AzureOpenAiPromptResponse = AiServiceResponse<
  AzureOpenAiReqType,
  AzureOpenAiResType
>;

export const DefaultAzureOpenAiConfig = {
  DEFAULT_SYSTEM_ROLE:
    'You are ChatGPT, a large language model trained by OpenAI, based on the GPT-3.5 architecture. Knowledge cutoff: 2021-09.',
  DEFAULT_GPT_MODEL: DefaultGptModels.AZURE_GPT_3_5,
};

export class AzureOpenAiService extends AiService<
  AzureOpenAiReqType,
  AzureOpenAiResType
> {
  private static instance: AzureOpenAiService;
  aiServiceClient: OpenAIClient;

  constructor() {
    super(
      AvailableAiServiceNames.AZURE_OPEN_AI,
      DefaultGptModels.AZURE_GPT_3_5
    );
    const azureApiEndpoint = requireEnv('AZURE_API_ENDPOINT');
    const azureApiKey = requireEnv('AZURE_API_KEY');
    this.aiServiceClient = new OpenAIClient(
      azureApiEndpoint,
      new AzureKeyCredential(azureApiKey)
    );
  }

  static getInstance(): AzureOpenAiService {
    if (!AzureOpenAiService.instance) {
      AzureOpenAiService.instance = new AzureOpenAiService();
    }
    return AzureOpenAiService.instance;
  }

  async executeAiUntilProperData(
    params: AzureOpenAiReqType,
    mustBeJson: boolean,
    jsonSchema?: Schema
  ): Promise<[AzureOpenAiResType, string]> {
    let result = await this.executeAzureOpenAi(params);
    let answer = result.choices[0].message?.content || '';
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
          const newParams = {
            ...params,
            options: {
              ...params.options,
              temperature: AI_DEFAULT_TEMP + j * 0.1,
            },
          };
          result = await this.executeAzureOpenAi(newParams);
          answer = result.choices[0].message?.content || '';
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

  async executeAzureOpenAi(params: AzureOpenAiReqType) {
    let id = uuid();
    console.log(
      `Executing Azure OpenAI request ${id} starting at ${new Date().toISOString()}`
    );
    const { deploymentName, messages, options } = params;
    const res = await this.aiServiceClient.getChatCompletions(
      deploymentName,
      messages,
      options
    );
    if (!res.choices.length) {
      throw new Error('Azure OpenAI API Error: No choices provided.');
    }
    const answer = res.choices[0].message?.content;
    if (!answer) {
      throw new Error('Azure OpenAI API Error: No response message content.');
    }
    console.log(
      `Executing Azure OpenAI request ${id} ending at ${new Date().toISOString()}`
    );
    return res;
  }

  convertContextDataToServiceParams(
    requestContext: AiRequestContext
  ): AzureOpenAiReqType {
    const { aiStep, docsPlainText, previousOutput } = requestContext;
    const request: AzureOpenAiReqType = {
      deploymentName:
        aiStep.targetAiServiceModel.model ||
        DefaultAzureOpenAiConfig.DEFAULT_GPT_MODEL,
      messages: [],
      options: {
        temperature: AI_DEFAULT_TEMP,
      },
    };
    request.messages.push({
      role: PromptRoles.SYSTEM,
      content:
        aiStep.systemRole || DefaultAzureOpenAiConfig.DEFAULT_SYSTEM_ROLE,
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
      } as ChatRequestMessageUnion);
    });

    return request;
  }

  async completeChat(
    context: AiRequestContext
  ): Promise<AzureOpenAiPromptResponse> {
    const azureAiRequestContext =
      this.convertContextDataToServiceParams(context);
    const [choices, answer] = await this.executeAiUntilProperData(
      azureAiRequestContext,
      false
    );
    return {
      aiStepData: {
        aiServiceRequestParams: azureAiRequestContext,
        aiServiceResponse: choices,
      },
      answer: answer,
    };
  }
}
