/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import Anthropic from '@anthropic-ai/sdk';
import {
  AiRequestContext,
  DefaultGptModels,
  PromptOutputTypes,
} from '../../types.js';
import { AiService } from '../abstract-classes/abstract-ai-service.js';
import { v4 as uuid } from 'uuid';
import { Schema } from 'jsonschema';
import { isProperJson } from '../../helpers.js';
import { AI_DEFAULT_TEMP, RETRY_ATTEMPTS } from '../../constants.js';
import {
  AiStepData,
  AiServiceResponse,
  AvailableAiServiceNames,
} from '../ai-service-factory.js';
import { AiModelConfigs } from '../../hooks/ai-model-configs.js';
import { AiServiceModelConfigs } from '../../gql_types.js';

export const DefaultAnthropicConfig = {
  DEFAULT_SYSTEM_ROLE:
    'You are Claude, an AI assistant created by Anthropic. You are helpful, harmless, and honest.',
  DEFAULT_CLAUDE_MODEL: DefaultGptModels.ANTHROPIC_CLAUDE_3_5_SONNET_LATEST,
};

// Library does not provide enum for roles, so we define it ourselves
export enum AnthropicRoles {
  USER = 'user',
  ASSISTANT = 'assistant',
}

export type AnthropicReqType =
  Anthropic.Messages.MessageCreateParamsNonStreaming;
export type AnthropicResType = Anthropic.Messages.Message;

export type AnthropicStepDataType = AiStepData<
  AnthropicReqType,
  AnthropicResType
>;
export type AnthropicPromptResponse = AiServiceResponse<
  AnthropicReqType,
  AnthropicResType
>;

/**
 * Required: ANTHROPIC_API_KEY environment variable
 */
export class AnthropicService extends AiService<
  AnthropicReqType,
  AnthropicResType
> {
  private static instance: AnthropicService;
  aiServiceClient: Anthropic;

  constructor(llmModelConfigs: AiServiceModelConfigs[]) {
    super(
      AvailableAiServiceNames.ANTHROPIC,
      DefaultGptModels.ANTHROPIC_CLAUDE_3_5_SONNET_LATEST,
      llmModelConfigs
    );
    this.aiServiceClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 30 * 1000, // 30 seconds
    });
  }

  static getInstance(
    llmModelConfigs: AiServiceModelConfigs[]
  ): AnthropicService {
    if (!AnthropicService.instance) {
      AnthropicService.instance = new AnthropicService(llmModelConfigs);
    }
    return AnthropicService.instance;
  }

  async executeAiUntilProperData(
    params: AnthropicReqType,
    mustBeJson: boolean,
    jsonSchema?: Schema
  ): Promise<[AnthropicResType, string]> {
    let result = await this.executeAnthropic(params);
    let answer = this.extractTextFromResponse(result);
    if (mustBeJson) {
      let isJsonResponse = isProperJson(answer, jsonSchema);
      if (!isJsonResponse) {
        for (let j = 0; j < RETRY_ATTEMPTS; j++) {
          console.log(`Attempt ${j}`);
          if (isJsonResponse) {
            break;
          }
          const newParams: AnthropicReqType = {
            ...params,
            temperature: AI_DEFAULT_TEMP + j * 0.1,
          };
          result = await this.executeAnthropic(newParams);
          answer = this.extractTextFromResponse(result);
          if (!answer) {
            throw new Error(
              'Anthropic API Error: No response message content.'
            );
          }
          isJsonResponse = isProperJson(answer, jsonSchema);
        }
      }
      if (!isJsonResponse) {
        throw new Error(
          `Anthropic API Error: No valid JSON response after ${RETRY_ATTEMPTS} attempts.`
        );
      }
    }
    return [result, answer || ''];
  }

  private extractTextFromResponse(response: AnthropicResType): string {
    const allTextContent = response.content.reduce((acc, content) => {
      if (content.type === 'text') {
        acc += content.text + '\n';
      }
      return acc;
    }, '' as string);
    return allTextContent;
  }

  async executeAnthropic(params: AnthropicReqType) {
    let id = uuid();
    console.log(
      `Executing Anthropic request ${id} starting at ${new Date().toISOString()}`
    );
    const result = await this.aiServiceClient.messages.create(params);
    const answer = this.extractTextFromResponse(result);
    if (!answer) {
      throw new Error('Anthropic API Error: No response message content.');
    }
    console.log(
      `Executing Anthropic request ${id} ending at ${new Date().toISOString()}`
    );
    return result;
  }

  convertContextDataToServiceParams(
    requestContext: AiRequestContext
  ): AnthropicReqType {
    const { aiStep, docsPlainText, previousOutput } = requestContext;
    const llmModelInfo = AiModelConfigs.getModelInfo(
      aiStep.targetAiServiceModel,
      this.llmModelConfigs
    );
    const messages: Anthropic.Messages.MessageParam[] = [];
    let systemMessage =
      aiStep.systemRole || DefaultAnthropicConfig.DEFAULT_SYSTEM_ROLE;

    if (aiStep.responseFormat) {
      systemMessage += `\n\nPlease format your response in accordance to this guideline: ---------- \n\n ${aiStep.responseFormat}`;
    }
    if (aiStep.outputDataType === PromptOutputTypes.JSON) {
      systemMessage += `\n\nDO NOT INCLUDE ANY JSON MARKDOWN IN RESPONSE, ONLY JSON DATA`;
    }
    if (previousOutput) {
      systemMessage += `\n\nHere is the previous output: ---------- \n\n ${previousOutput}`;
    }
    const includeEssay = aiStep.prompts.some((prompt) => prompt.includeEssay);
    if (includeEssay) {
      systemMessage += `\n\nHere is the users essay: -----------\n\n${docsPlainText}`;
    }

    aiStep.prompts.forEach((prompt) => {
      messages.push({
        role: AnthropicRoles.USER,
        content: prompt.promptText,
      });
    });

    const webSearchTool: Anthropic.Messages.WebSearchTool20250305 = {
      type: 'web_search_20250305',
      name: 'web_search',
      max_uses: 2,
    };

    const newReq: AnthropicReqType = {
      model: llmModelInfo.name,
      max_tokens: llmModelInfo.maxTokens,
      system: systemMessage,
      messages: messages,
      temperature: AI_DEFAULT_TEMP,
      tools: llmModelInfo.supportsWebSearch ? [webSearchTool] : [],
    };

    return newReq;
  }

  async completeChat(
    context: AiRequestContext
  ): Promise<AnthropicPromptResponse> {
    const params = this.convertContextDataToServiceParams(context);
    const [chatCompleteResponse, answer] = await this.executeAiUntilProperData(
      params,
      context.aiStep.outputDataType == PromptOutputTypes.JSON,
      context.aiStep.responseSchema
    );

    return {
      aiStepData: {
        aiServiceRequestParams: params,
        aiServiceResponse: chatCompleteResponse,
        tokenUsage: {
          promptUsage: chatCompleteResponse.usage.input_tokens || -1,
          completionUsage: chatCompleteResponse.usage.output_tokens || -1,
          totalUsage:
            (chatCompleteResponse.usage.input_tokens || 0) +
            (chatCompleteResponse.usage.output_tokens || 0),
        },
      },
      answer: answer,
    };
  }
}
