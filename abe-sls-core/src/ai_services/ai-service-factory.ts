/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import {
  AskSageService,
  SagePromptResponse,
  SageStepDataType,
} from './ask-sage/ask-sage-service.js';
import {
  AzureOpenAiPromptResponse,
  AzureOpenAiService,
  AzureOpenAiStepDataType,
} from './azure/azure-ai-service.js';
import {
  CamoGptPromptResponse,
  CamoGptService,
  CamoGptStepDataType,
} from './camo-gpt/camo-gpt-service.js';
import {
  GeminiAiService,
  GeminiPromptResponse,
  GeminiStepDataType,
} from './gemini/gemini-ai-service.js';
import {
  OpenAiPromptResponse,
  OpenAiService,
  OpenAiStepDataType,
} from './openai/open-ai-service.js';
import {
  AnthropicPromptResponse,
  AnthropicService,
  AnthropicStepDataType,
} from './anthropic/anthropic-service.js';

export interface AiStepData<ReqType, ResType> {
  aiServiceRequestParams: ReqType;
  aiServiceResponse: ResType;
  tokenUsage: {
    promptUsage: number;
    completionUsage: number;
    totalUsage: number;
  };
}

export interface AiServiceResponse<ReqType, ResType> {
  aiStepData: AiStepData<ReqType, ResType>;
  answer: string;
}

export interface AiServiceFinalResponseType {
  aiAllStepsData: AiServiceStepDataTypes[];
  answer: string;
}

/**
 * Merge all types here for use in abstract locations
 */
export type AiServiceStepDataTypes =
  | OpenAiStepDataType
  | AzureOpenAiStepDataType
  | GeminiStepDataType
  | CamoGptStepDataType
  | SageStepDataType
  | AnthropicStepDataType;
export type AiServicesPromptResponseTypes =
  | OpenAiPromptResponse
  | AzureOpenAiPromptResponse
  | GeminiPromptResponse
  | CamoGptPromptResponse
  | SagePromptResponse
  | AnthropicPromptResponse;
export type AvailableAiServices =
  | OpenAiService
  | AzureOpenAiService
  | GeminiAiService
  | CamoGptService
  | AskSageService
  | AnthropicService;

export enum AvailableAiServiceNames {
  OPEN_AI = 'OPEN_AI',
  AZURE_OPEN_AI = 'AZURE_OPEN_AI',
  GEMINI = 'GEMINI',
  CAMO_GPT = 'CAMO_GPT',
  ASK_SAGE = 'ASK_SAGE',
  ANTHROPIC = 'ANTHROPIC',
}

export class AiServiceFactory {
  static getAiService(targetAiService: AvailableAiServiceNames) {
    switch (targetAiService) {
      case AvailableAiServiceNames.OPEN_AI:
        return OpenAiService.getInstance();
      case AvailableAiServiceNames.AZURE_OPEN_AI:
        return AzureOpenAiService.getInstance();
      case AvailableAiServiceNames.GEMINI:
        return GeminiAiService.getInstance();
      case AvailableAiServiceNames.CAMO_GPT:
        return CamoGptService.getInstance();
      case AvailableAiServiceNames.ASK_SAGE:
        return AskSageService.getInstance();
      case AvailableAiServiceNames.ANTHROPIC:
        return AnthropicService.getInstance();
      default:
        throw new Error('Invalid AI service name');
    }
  }
}
