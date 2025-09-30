/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import * as https from 'https';
import dotenv from 'dotenv';
import {
  isJsonString,
  userEssayPromptFormat,
  validateJsonResponse,
} from '../../helpers.js';
import axios from 'axios';
import { PromptOutputTypes } from '../../types.js';
import { AiService } from '../abstract-classes/abstract-ai-service.js';
import {
  AiRequestContext,
  DefaultGptModels,
  PromptRoles,
} from '../../types.js';
import { Schema } from 'jsonschema';
import { RETRY_ATTEMPTS, AI_DEFAULT_TEMP } from '../../constants.js';
import {
  AiServiceResponse,
  AiStepData,
  AvailableAiServiceNames,
} from '../ai-service-factory.js';
import { AiServiceModelConfigs } from '../../gql_types.js';
import OpenAI from 'openai';
import { AiModelConfigs } from '../../hooks/ai-model-configs.js';

dotenv.config();

interface ApiRequestData {
  model: string;
  system_prompt: string;
  persona: string;
  message: string;
  limit_references?: number;
  live?: number;
  temperature?: number;
  dataset?: string;
  // Ask Sage supports web search through openAI tools
  tools?: OpenAI.Responses.Tool[];
  tool_choice?: OpenAI.Responses.ToolChoiceTypes;
}

interface SageRes {
  added_obj: any;
  emdedding_down: boolean;
  message: string;
  references: string;
  response: string;
  status: number;
  tool_calls: any;
  type: string;
  usage: any;
  uuid: string;
  vectors_down: boolean;
}

const apiKey: string = process.env.SAGE_API_KEY || '';

export type SageReqType = ApiRequestData;
export type SageResType = SageRes;
export type SageStepDataType = AiStepData<SageReqType, SageResType>;
export type SagePromptResponse = AiServiceResponse<SageReqType, SageResType>;

/**
 * Required: SAGE_API_KEY environment variable
 */
export class AskSageService extends AiService<SageReqType, SageResType> {
  private static instance: AskSageService;
  aiServiceClient: any;

  constructor(llmModelConfigs: AiServiceModelConfigs[]) {
    super(
      AvailableAiServiceNames.ASK_SAGE,
      DefaultGptModels.SAGE_GPT_4O_GOV,
      llmModelConfigs
    );
  }

  static getInstance(llmModelConfigs: AiServiceModelConfigs[]): AskSageService {
    if (!AskSageService.instance) {
      AskSageService.instance = new AskSageService(llmModelConfigs);
    }
    return AskSageService.instance;
  }

  async executeAiUntilProperData(
    params: SageReqType,
    mustBeJson: boolean,
    jsonSchema?: Schema
  ): Promise<[SageResType, string]> {
    let result = await this.executeAskSage(params);
    let answer = result.message;
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
          const newParams: SageReqType = {
            ...params,
            temperature: AI_DEFAULT_TEMP + j * 0.1,
          };
          result = await this.executeAskSage(newParams);
          answer = result.message || '';
          if (!answer) {
            throw new Error('Sage API Error: No response message content.');
          }
          isJsonResponse = checkJson(answer);
        }
      }
      if (!isJsonResponse) {
        throw new Error(
          `Sage API Error: No valid JSON response after ${RETRY_ATTEMPTS} attempts.`
        );
      }
    }
    return [result, answer || ''];
  }

  async executeAskSage(params: SageReqType): Promise<SageResType> {
    const response = await axios.post<SageResType>(
      'https://api.asksage.ai/server/query',
      params,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-access-tokens': apiKey,
        },
      }
    );
    const result = response.data;
    if (!result) {
      throw new Error('Sage API Error: No response message content.');
    }
    return result;
  }

  convertContextDataToServiceParams(
    requestContext: AiRequestContext
  ): SageReqType {
    const { aiStep, docsPlainText, previousOutput } = requestContext;
    const llmModelInfo = AiModelConfigs.getModelInfo(
      aiStep.targetAiServiceModel,
      this.llmModelConfigs
    );
    const requestData: SageReqType = {
      model: aiStep.targetAiServiceModel.model,
      message: '',
      persona: '',
      system_prompt: '',
    };

    if (aiStep.systemRole) {
      requestData.system_prompt += JSON.stringify({
        role: PromptRoles.USER,
        content: aiStep.systemRole,
      });
    }

    requestData.system_prompt += '\n';

    const includeEssay = aiStep.prompts.some((prompt) => prompt.includeEssay);
    if (includeEssay) {
      requestData.system_prompt += JSON.stringify({
        role: PromptRoles.USER,
        content: userEssayPromptFormat(docsPlainText),
      });
      requestData.system_prompt += '\n';
    }

    if (aiStep.responseFormat) {
      requestData.system_prompt += JSON.stringify({
        role: PromptRoles.USER,
        content: `Please format your response in accordance to this guideline: ---------- \n\n ${aiStep.responseFormat}`,
      });
      requestData.system_prompt += '\n';
    }
    if (aiStep.outputDataType === PromptOutputTypes.JSON) {
      requestData.system_prompt += JSON.stringify({
        role: PromptRoles.USER,
        content: `\n\nDO NOT INCLUDE ANY JSON MARKDOWN IN RESPONSE, ONLY JSON DATA`,
      });
      requestData.system_prompt += '\n';
    }
    if (previousOutput) {
      requestData.system_prompt += JSON.stringify({
        role: PromptRoles.USER,
        content: `Here is the previous output: ---------- \n\n ${previousOutput}`,
      });
      requestData.system_prompt += '\n';
    }
    aiStep.prompts.forEach((prompt) => {
      requestData.message += prompt.promptText;
      requestData.message += '\n';
    });

    if (aiStep.webSearch && llmModelInfo.supportsWebSearch) {
      requestData.tools = [{ type: 'web_search_preview' }];
      // forces the model to use the web_search_preview tool, whereas it would otherwise determine if it really needs to use the tool based on the prompt
      requestData.tool_choice = { type: 'web_search_preview' };
    }

    return requestData;
  }

  async completeChat(context: AiRequestContext): Promise<SagePromptResponse> {
    const reqData = this.convertContextDataToServiceParams(context);
    const [response, answer] = await this.executeAiUntilProperData(
      {
        ...reqData,
        limit_references: 0,
        live: 0,
        dataset: 'none',
      },
      context.aiStep.outputDataType === PromptOutputTypes.JSON,
      context.aiStep.responseSchema
    );

    return {
      aiStepData: {
        aiServiceRequestParams: reqData,
        aiServiceResponse: response,
        tokenUsage: {
          promptUsage: 0,
          completionUsage: 0,
          totalUsage: 0,
        },
      },
      answer: answer,
    };
  }
}
