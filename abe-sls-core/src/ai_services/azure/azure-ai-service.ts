/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { AiService } from '../abstract-classes/abstract-ai-service.js';
import {
  AiRequestContext,
  DefaultGptModels,
  PromptOutputTypes,
  PromptRoles,
} from '../../types.js';
import { AzureOpenAI } from 'openai';
import { isJsonString, validateJsonResponse } from '../../helpers.js';
import {
  AiServiceResponse,
  AiStepData,
  AvailableAiServiceNames,
} from '../ai-service-factory.js';
import { Schema } from 'jsonschema';
import { AI_DEFAULT_TEMP, RETRY_ATTEMPTS } from '../../constants.js';
import { v4 as uuid } from 'uuid';
import {
  ResponseCreateParamsNonStreaming,
  Response,
} from 'openai/resources/responses/responses.js';

export type AzureOpenAiReqType = ResponseCreateParamsNonStreaming;
export type AzureOpenAiResType = Response;

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
  aiServiceClient: AzureOpenAI;

  constructor() {
    super(
      AvailableAiServiceNames.AZURE_OPEN_AI,
      DefaultGptModels.AZURE_GPT_3_5
    );
    this.aiServiceClient = new AzureOpenAI({
      apiVersion: '2025-01-01-preview', // Latest GA release
    });
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
    let answer = result.output_text || '';
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
            temperature: AI_DEFAULT_TEMP + j * 0.1,
          };
          result = await this.executeAzureOpenAi(newParams);
          answer = result.output_text || '';
          if (!answer) {
            throw new Error(
              'Azure OpenAI API Error: No response message content.'
            );
          }
          isJsonResponse = checkJson(answer);
        }
      }
      if (!isJsonResponse) {
        throw new Error(
          `Azure OpenAI API Error: No valid JSON response after ${RETRY_ATTEMPTS} attempts.`
        );
      }
    }
    return [result, answer || ''];
  }

  async executeAzureOpenAi(params: AzureOpenAiReqType) {
    let id = uuid();
    console.log(
      `Executing Azure OpenAI request ${id} starting at ${new Date().toISOString()} with params: ${JSON.stringify(params, null, 2)}`
    );
    this.aiServiceClient.deploymentName = params.model;
    const res = await this.aiServiceClient.responses.create({
      ...params,
    });
    const answer = res.output_text;
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
      model: aiStep.targetAiServiceModel.model,
      input: [],
      temperature: AI_DEFAULT_TEMP,
    };
    const inputMessages = [];
    inputMessages.push({
      role: PromptRoles.SYSTEM,
      content:
        aiStep.systemRole || DefaultAzureOpenAiConfig.DEFAULT_SYSTEM_ROLE,
    });
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

    const includeEssay = aiStep.prompts.some((prompt) => prompt.includeEssay);

    if (includeEssay) {
      inputMessages.push({
        role: PromptRoles.SYSTEM,
        content: `Here is the users essay: -----------\n\n${docsPlainText}`,
      });
    }

    aiStep.prompts.forEach((prompt) => {
      let text = prompt.promptText;
      inputMessages.push({
        role: prompt.promptRole || PromptRoles.USER,
        content: text,
      });
    });

    // //   TODO: re-enable if web search tool is ever added for Azure OpenAI
    // if (aiStep.webSearch) {
    //   request.tools = [{ type: 'web_search_preview' }];
    //   // forces the model to use the web_search_preview tool, whereas it would otherwise determine if it really needs to use the tool based on the prompt
    //   request.tool_choice = { type: 'web_search_preview' };
    // }

    request.input = inputMessages;
    request.store = false;
    request.max_output_tokens = 4096;
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
        tokenUsage: {
          promptUsage: choices.usage?.input_tokens || -1,
          completionUsage: choices.usage?.output_tokens || -1,
          totalUsage: choices.usage?.total_tokens || -1,
        },
      },
      answer: answer,
    };
  }
}
