/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import {
  DynamicRetrievalMode,
  GoogleGenerativeAI,
  StartChatParams,
} from '@google/generative-ai';
import { AiService } from '../abstract-classes/abstract-ai-service.js';
import {
  AiServiceResponse,
  AiStepData,
  AvailableAiServiceNames,
} from '../ai-service-factory.js';
import {
  convertMarkdownToJsonString,
  isJsonMarkdown,
  isJsonString,
  validateJsonResponse,
} from '../../helpers.js';
import {
  AiRequestContext,
  DefaultGptModels,
  PromptOutputTypes,
  PromptRoles,
} from '../../types.js';
import { Schema } from 'jsonschema';
import { RETRY_ATTEMPTS, AI_DEFAULT_TEMP } from '../../constants.js';
import { EnhancedGenerateContentResponse } from '@google/generative-ai/dist/types';
import {
  GenerateContentCandidate,
  PromptFeedback,
  UsageMetadata,
} from '@google/generative-ai/dist/types/responses';
import { FunctionCall } from '@google/generative-ai/dist/types/content.js';

export type GeminiReqType = GeminiChatCompletionRequest;
export type GeminiResType = GeminiJsonResponse;

export type GeminiStepDataType = AiStepData<GeminiReqType, GeminiResType>;
export type GeminiPromptResponse = AiServiceResponse<
  GeminiReqType,
  GeminiResType
>;

export interface GeminiChatCompletionRequest {
  startChatParams: StartChatParams;
  model: string;
  requestText: string;
}

export interface GeminiJsonResponse {
  text: string;
  functionCalls?: FunctionCall[];
  candidates?: GenerateContentCandidate[];
  promptFeedback?: PromptFeedback;
  usageMetadata?: UsageMetadata;
}

/**
 * Required: GEMINI_API_KEY environment variable
 */
export class GeminiAiService extends AiService<GeminiReqType, GeminiResType> {
  private static instance: GeminiAiService;
  aiServiceClient: GoogleGenerativeAI;

  constructor() {
    super(AvailableAiServiceNames.GEMINI, DefaultGptModels.GEMINI_1_PRO);
    const geminiApiKey = process.env.GEMINI_API_KEY || '';
    this.aiServiceClient = new GoogleGenerativeAI(geminiApiKey);
  }

  static getInstance(): GeminiAiService {
    if (!GeminiAiService.instance) {
      GeminiAiService.instance = new GeminiAiService();
    }
    return GeminiAiService.instance;
  }

  async executeAiUntilProperData(
    params: GeminiReqType,
    mustBeJson: boolean,
    request: (numAttemps: number) => Promise<EnhancedGenerateContentResponse>,
    jsonSchema?: Schema
  ): Promise<[EnhancedGenerateContentResponse, string]> {
    let result = await request(0);
    let answer = result.text();
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
          result = await request(j);
          answer = result.text();
          if (!answer) {
            throw new Error('Gemini API Error: No response message content.');
          }
          isJsonResponse = checkJson(answer);
        }
      }
      if (!isJsonResponse) {
        throw new Error(
          `Gemini API Error: No valid JSON response after ${RETRY_ATTEMPTS} attempts.`
        );
      }
    }
    return [result, answer || ''];
  }

  convertContextDataToServiceParams(
    requestContext: AiRequestContext
  ): GeminiReqType {
    const { aiStep, docsPlainText, previousOutput } = requestContext;
    const canUseSystemInstruction =
      aiStep.targetAiServiceModel.model === DefaultGptModels.GEMINI_1_5_PREVIEW;
    let customSystemInstructions = '';

    if (aiStep.systemRole) {
      customSystemInstructions += `You must respond according to this role: ${aiStep.systemRole}`;
    }

    if (aiStep.responseFormat) {
      customSystemInstructions += `\n\nYou must respond following these guidelines: ${aiStep.responseFormat}`;
    }

    if (aiStep.outputDataType === PromptOutputTypes.JSON) {
      customSystemInstructions += `\n\nDO NOT INCLUDE ANY JSON MARKDOWN IN RESPONSE, ONLY JSON DATA`;
    }

    const chatParams: StartChatParams = {
      history: [],
    };

    if (customSystemInstructions) {
      if (canUseSystemInstruction) {
        chatParams.systemInstruction = {
          role: 'user',
          parts: [
            {
              text: customSystemInstructions,
            },
          ],
        };
      } else {
        chatParams.history?.push({
          role: 'user',
          parts: [
            {
              text: customSystemInstructions,
            },
          ],
        });
      }
    }

    let contextText = '';

    if (!canUseSystemInstruction && aiStep.systemRole) {
      contextText += `You must respond according to this role: ${aiStep.systemRole}\n\n`;
    }

    if (previousOutput) {
      contextText += `Here is the previous Output:\n${previousOutput}\n\n`;
    }

    const includeEssay = aiStep.prompts.some((prompt) => prompt.includeEssay);

    if (includeEssay) {
      contextText += `Here is the essay:\n${docsPlainText}\n\n`;
    }

    chatParams.history?.push({
      role: 'user',
      parts: [
        {
          text: contextText,
        },
      ],
    });

    for (let i = 0; i < aiStep.prompts.length - 1; i++) {
      const prompt = aiStep.prompts[i];
      const promptRole =
        prompt.promptRole === PromptRoles.USER
          ? 'user'
          : prompt.promptRole === PromptRoles.SYSTEM
            ? 'model'
            : 'user';
      chatParams.history?.push({
        role: promptRole,
        parts: [
          {
            text: prompt.promptText,
          },
        ],
      });
    }
    const lastPromptStep = aiStep.prompts[aiStep.prompts.length - 1];

    // search does not work for 1.0 models
    if (
      aiStep.webSearch &&
      aiStep.targetAiServiceModel.model !== DefaultGptModels.GEMINI_1_PRO
    ) {
      // for 1.5 models, use Google Search Retrieval. For 2.0 models, use Search as a tool.
      if (
        aiStep.targetAiServiceModel.model ===
        DefaultGptModels.GEMINI_1_5_PREVIEW
      ) {
        chatParams.tools = [
          {
            googleSearchRetrieval: {
              dynamicRetrievalConfig: {
                mode: DynamicRetrievalMode.MODE_DYNAMIC,
                // 0 means always use retrieval
                dynamicThreshold: 0,
              },
            },
          },
        ];
      } else if (
        aiStep.targetAiServiceModel.model ===
        DefaultGptModels.GEMINI_2_0_PREVIEW
      ) {
        chatParams.tools = [
          {
            googleSearch: {},
            // gemini typescript types are not updated to include googleSearch, PR currently open: https://github.com/google-gemini/generative-ai-js/pull/370
          } as any,
        ];
      }
    }
    return {
      startChatParams: chatParams,
      model: aiStep.targetAiServiceModel.model,
      requestText: lastPromptStep.promptText,
    };
  }

  convertGeminiResToJson(res: EnhancedGenerateContentResponse): GeminiResType {
    const _res: GeminiJsonResponse = {
      text: res.text(),
      functionCalls: res.functionCalls(),
      candidates: res.candidates,
      promptFeedback: res.promptFeedback,
      usageMetadata: res.usageMetadata,
    };
    return _res;
  }

  async completeChat(context: AiRequestContext): Promise<GeminiPromptResponse> {
    const requestData: GeminiReqType =
      this.convertContextDataToServiceParams(context);

    const model = this.aiServiceClient.getGenerativeModel({
      model: requestData.model,
    });
    async function getResponse(numAttempts: number) {
      model.generationConfig.temperature = AI_DEFAULT_TEMP + numAttempts * 0.1;

      const chat = model.startChat(requestData.startChatParams);
      const result = await chat.sendMessage(requestData.requestText);
      const response = await result.response;
      return response;
    }
    const [aiResponse, answer] = await this.executeAiUntilProperData(
      requestData,
      context.aiStep.outputDataType === PromptOutputTypes.JSON,
      getResponse,
      context.aiStep.responseSchema
    );
    return {
      aiStepData: {
        aiServiceRequestParams: requestData,
        aiServiceResponse: this.convertGeminiResToJson(aiResponse),
        tokenUsage: {
          promptUsage: aiResponse.usageMetadata?.promptTokenCount || -1,
          completionUsage: aiResponse.usageMetadata?.candidatesTokenCount || -1,
          totalUsage: aiResponse.usageMetadata?.totalTokenCount || -1,
        },
      },
      answer: answer,
    };
  }
}
