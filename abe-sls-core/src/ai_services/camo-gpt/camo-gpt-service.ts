/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import * as https from 'https';
import dotenv from 'dotenv';
import requireEnv, {
  isJsonString,
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
import { SecretRuntimeFetchFactory } from '../../cloud_services/generic_classes/secret_runtime_fetch/secret_runtime_fetch_factory.js';

dotenv.config();

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ApiRequestData {
  api_key: string | undefined;
  model: string;
  messages: Message[];
  temperature?: number;
}

interface ChatResponse {
  choices: Array<{
    message: {
      content: string;
      [key: string]: any;
    };
    [key: string]: any;
  }>;
  [key: string]: any;
}

export const DefaultCamoGptConfig = {
  DEFAULT_GPT_MODEL: DefaultGptModels.CAMO_GPT_MISTRAL_7B,
  DEFAULT_SYSTEM_ROLE:
    'You are ChatGPT, a large language model trained by OpenAI, based on the GPT-3.5 architecture. Knowledge cutoff: 2021-09.',
};

const apiKey: string = requireEnv('CAMO_GPT_API_KEY');

export type CamoGptReqType = ApiRequestData;
export type CamoGptResType = ChatResponse;
export type CamoGptStepDataType = AiStepData<CamoGptReqType, CamoGptResType>;
export type CamoGptPromptResponse = AiServiceResponse<
  CamoGptReqType,
  CamoGptResType
>;
export class CamoGptService extends AiService<CamoGptReqType, CamoGptResType> {
  private static instance: CamoGptService;
  aiServiceClient: any;

  constructor() {
    super(
      AvailableAiServiceNames.CAMO_GPT,
      DefaultGptModels.CAMO_GPT_MISTRAL_7B
    );
  }

  static getInstance(): CamoGptService {
    if (!CamoGptService.instance) {
      CamoGptService.instance = new CamoGptService();
    }
    return CamoGptService.instance;
  }

  async executeAiUntilProperData(
    params: CamoGptReqType,
    mustBeJson: boolean,
    jsonSchema?: Schema
  ): Promise<[CamoGptResType, string]> {
    const cert =
      await SecretRuntimeFetchFactory.getSecretRuntimeFetchInstance().fetchSecret(
        '/ABE/CAMO_GPT_CERT'
      );
    let result = await this.executeCamoGpt(params, cert);
    let answer = result.choices[0].message.content;
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
          const newParams: CamoGptReqType = {
            ...params,
            temperature: AI_DEFAULT_TEMP + j * 0.1,
          };
          result = await this.executeCamoGpt(newParams, cert);
          answer = result.choices[0].message.content || '';
          if (!answer) {
            throw new Error('CamoGPT API Error: No response message content.');
          }
          isJsonResponse = checkJson(answer);
        }
      }
      if (!isJsonResponse) {
        throw new Error(
          `CamoGPT API Error: No valid JSON response after ${RETRY_ATTEMPTS} attempts.`
        );
      }
    }
    return [result, answer || ''];
  }

  async executeCamoGpt(
    params: CamoGptReqType,
    cert: string
  ): Promise<CamoGptResType> {
    const httpsAgent = new https.Agent({
      cert: cert,
      key: cert,
      rejectUnauthorized: false,
    });

    const response = await axios.post<ChatResponse>(
      'https://omni.army.mil/camogptapi/v2/chat/completions',
      params,
      {
        httpsAgent,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    const result = response.data.choices[0].message.content;
    if (!result) {
      throw new Error('CamoGPT API Error: No response message content.');
    }
    return response.data;
  }

  convertContextDataToServiceParams(
    requestContext: AiRequestContext
  ): CamoGptReqType {
    const { aiStep, docsPlainText, previousOutput } = requestContext;
    const requestData: CamoGptReqType = {
      api_key: apiKey,
      model: aiStep.targetAiServiceModel.model,
      messages: [],
    };
    const inputMessages: Message[] = [];
    inputMessages.push({
      role: PromptRoles.SYSTEM,
      content: aiStep.systemRole || DefaultCamoGptConfig.DEFAULT_SYSTEM_ROLE,
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
      inputMessages.push({
        role: prompt.promptRole || PromptRoles.USER,
        content: prompt.promptText,
      });
    });
    // TODO: add web search
    // if (aiStep.webSearch) {
    //   newReq.tools = [{ type: 'web_search_preview' }];
    //   // forces the model to use the web_search_preview tool, whereas it would otherwise determine if it really needs to use the tool based on the prompt
    //   newReq.tool_choice = { type: 'web_search_preview' };
    // }
    // newReq.store = false;

    // newReq.input = inputMessages;
    return {
      ...requestData,
      messages: inputMessages,
    };
  }

  async completeChat(
    context: AiRequestContext
  ): Promise<CamoGptPromptResponse> {
    const reqData = this.convertContextDataToServiceParams(context);
    const apiRequestData: ApiRequestData = reqData;
    const [response, answer] = await this.executeAiUntilProperData(
      apiRequestData,
      context.aiStep.outputDataType === PromptOutputTypes.JSON,
      context.aiStep.responseSchema
    );

    console.log(response.data.choices[0].message.content);
    return {
      aiStepData: {
        aiServiceRequestParams: reqData,
        aiServiceResponse: response.data,
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
