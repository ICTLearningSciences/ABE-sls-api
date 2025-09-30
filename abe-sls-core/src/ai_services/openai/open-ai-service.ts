/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import OpenAI from 'openai';
import {
  AiRequestContext,
  DefaultGptModels,
  PromptOutputTypes,
  PromptRoles,
} from '../../types.js';
import { AiService } from '../abstract-classes/abstract-ai-service.js';
import { v4 as uuid } from 'uuid';
import { Schema } from 'jsonschema';
import {
  convertMarkdownToJsonString,
  isJsonMarkdown,
  isJsonString,
  userEssayPromptFormat,
  validateJsonResponse,
} from '../../helpers.js';
import { AI_DEFAULT_TEMP, RETRY_ATTEMPTS } from '../../constants.js';
import {
  AiStepData,
  AiServiceResponse,
  AvailableAiServiceNames,
} from '../ai-service-factory.js';
import {
  ResponseCreateParamsNonStreaming,
  Response,
} from 'openai/resources/responses/responses.js';
import { AiModelConfigs } from '../../hooks/ai-model-configs.js';
import { AiServiceModelConfigs } from '../../gql_types.js';

export const DefaultOpenAiConfig = {
  DEFAULT_SYSTEM_ROLE:
    'You are ChatGPT, a large language model trained by OpenAI, based on the GPT-3.5 architecture. Knowledge cutoff: 2021-09.',
  DEFAULT_GPT_MODEL: DefaultGptModels.OPEN_AI_GPT_4,
};

interface InputMessageType {
  role: PromptRoles;
  content: string;
}

export type OpenAiReqType = ResponseCreateParamsNonStreaming;
export type OpenAiResType = Response;

export type OpenAiStepDataType = AiStepData<OpenAiReqType, OpenAiResType>;
export type OpenAiPromptResponse = AiServiceResponse<
  OpenAiReqType,
  OpenAiResType
>;

/**
 * Required: OPENAI_API_KEY environment variable
 */
export class OpenAiService extends AiService<OpenAiReqType, OpenAiResType> {
  private static instance: OpenAiService;
  aiServiceClient: OpenAI;

  constructor(llmModelConfigs: AiServiceModelConfigs[]) {
    super(
      AvailableAiServiceNames.OPEN_AI,
      DefaultGptModels.OPEN_AI_GPT_4,
      llmModelConfigs
    );
    this.aiServiceClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30 * 1000, // 30 seconds to be in line with lambda timeout (default is 10 minutes)
    });
  }

  static getInstance(llmModelConfigs: AiServiceModelConfigs[]): OpenAiService {
    if (!OpenAiService.instance) {
      OpenAiService.instance = new OpenAiService(llmModelConfigs);
    }
    return OpenAiService.instance;
  }

  async executeAiUntilProperData(
    params: OpenAiReqType,
    mustBeJson: boolean,
    jsonSchema?: Schema
  ): Promise<[OpenAiResType, string]> {
    let result = await this.executeOpenAi(params);
    let answer = result.output_text || '';
    console.log('answer', answer);
    if (mustBeJson) {
      if (isJsonMarkdown(answer)) {
        answer = convertMarkdownToJsonString(answer);
      }
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
          const newParams: OpenAiReqType = {
            ...params,
            temperature: AI_DEFAULT_TEMP + j * 0.1,
          };
          result = await this.executeOpenAi(newParams);
          answer = result.output_text || '';
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

  async executeOpenAi(params: OpenAiReqType) {
    let id = uuid();
    console.log(
      `Executing OpenAI request ${id} starting at ${new Date().toISOString()}`
    );
    const result = await this.aiServiceClient.responses.create(params);
    const answer = result.output_text;
    if (!answer) {
      throw new Error('OpenAI API Error: No response message content.');
    }
    console.log(
      `Executing OpenAI request ${id} ending at ${new Date().toISOString()}`
    );
    return result;
  }

  applyWebSearchTool(req: OpenAiReqType) {
    req.tools = [{ type: 'web_search_preview' }];
    // forces the model to use the web_search_preview tool, whereas it would otherwise determine if it really needs to use the tool based on the prompt
    req.tool_choice = { type: 'web_search_preview' };
    req.input = (req.input as InputMessageType[]).map((message) => {
      // convert system instructions to user instructions
      if (message.role === PromptRoles.SYSTEM) {
        return {
          ...message,
          role: PromptRoles.USER,
        };
      }
      return message;
    });
    return req;
  }

  convertContextDataToServiceParams(
    requestContext: AiRequestContext
  ): OpenAiReqType {
    const { aiStep, docsPlainText, previousOutput } = requestContext;
    const llmModelInfo = AiModelConfigs.getModelInfo(
      aiStep.targetAiServiceModel,
      this.llmModelConfigs
    );
    let newReq: OpenAiReqType = {
      model: llmModelInfo.name,
      input: [],
      max_output_tokens: llmModelInfo.maxTokens,
    };
    const inputMessages: InputMessageType[] = [];
    inputMessages.push({
      role: PromptRoles.SYSTEM,
      content: aiStep.systemRole || DefaultOpenAiConfig.DEFAULT_SYSTEM_ROLE,
    });
    const includeEssay = aiStep.prompts.some((prompt) => prompt.includeEssay);
    if (includeEssay) {
      inputMessages.push({
        role: PromptRoles.SYSTEM,
        content: userEssayPromptFormat(docsPlainText),
      });
    }
    if (aiStep.responseFormat) {
      inputMessages.push({
        role: PromptRoles.SYSTEM,
        content: `Please format your response in accordance to this guideline: ---------- \n\n ${aiStep.responseFormat}`,
      });
    }
    if (aiStep.outputDataType === PromptOutputTypes.JSON) {
      inputMessages.push({
        role: PromptRoles.SYSTEM,
        content: `\n\nDO NOT INCLUDE ANY JSON MARKDOWN IN RESPONSE, ONLY JSON DATA`,
      });
    }
    if (previousOutput) {
      inputMessages.push({
        role: PromptRoles.SYSTEM,
        content: `Here is the previous output: ---------- \n\n ${previousOutput}`,
      });
    }
    aiStep.prompts.forEach((prompt) => {
      inputMessages.push({
        role: prompt.promptRole || PromptRoles.USER,
        content: prompt.promptText,
      });
    });

    newReq.store = false;
    newReq.input = inputMessages;
    if (aiStep.webSearch && llmModelInfo.supportsWebSearch) {
      newReq = this.applyWebSearchTool(newReq);
    }

    return newReq;
  }

  async completeChat(context: AiRequestContext): Promise<OpenAiPromptResponse> {
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
          promptUsage: chatCompleteResponse.usage?.input_tokens || -1,
          completionUsage: chatCompleteResponse.usage?.output_tokens || -1,
          totalUsage: chatCompleteResponse.usage?.total_tokens || -1,
        },
      },
      answer: answer,
    };
  }
}
