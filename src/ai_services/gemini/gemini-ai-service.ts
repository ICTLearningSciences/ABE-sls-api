/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { GoogleGenerativeAI, StartChatParams } from '@google/generative-ai';
import { AiService } from '../../ai_services/abstract-classes/abstract-ai-service.js';
import {
  AiServiceResponse,
  AiStepData,
  AvailableAiServiceNames,
} from '../../ai_services/ai-service-factory.js';
import requireEnv from '../../helpers.js';
import {
  AiRequestContext,
  DefaultGptModels,
  PromptRoles,
} from '../../types.js';

export type GeminiReqType = GeminiChatCompletionRequest;
export type GeminiResType = string;

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

export class GeminiAiService extends AiService<GeminiReqType, GeminiResType> {
  private static instance: GeminiAiService;
  aiServiceClient: GoogleGenerativeAI;

  constructor() {
    super(AvailableAiServiceNames.GEMINI, DefaultGptModels.GEMINI_1_PRO);
    const geminiApiKey = requireEnv('GEMINI_API_KEY');
    this.aiServiceClient = new GoogleGenerativeAI(geminiApiKey);
  }

  static getInstance(): GeminiAiService {
    if (!GeminiAiService.instance) {
      GeminiAiService.instance = new GeminiAiService();
    }
    return GeminiAiService.instance;
  }

  convertContextDataToServiceParams(
    requestContext: AiRequestContext
  ): GeminiReqType {
    const { aiStep, docsPlainText, previousOutput } = requestContext;
    const chatParams: StartChatParams = {
      systemInstruction: requestContext.aiStep.systemRole,
      history: [],
    };

    let contextText = '';

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
      chatParams.history?.push({
        role: prompt.promptRole || PromptRoles.USER,
        parts: [
          {
            text: prompt.promptText,
          },
        ],
      });
    }
    const lastPromptStep = aiStep.prompts[aiStep.prompts.length - 1];
    return {
      startChatParams: chatParams,
      model: aiStep.targetAiServiceModel.model,
      requestText: lastPromptStep.promptText,
    };
  }

  async completeChat(context: AiRequestContext): Promise<GeminiPromptResponse> {
    const requestData: GeminiReqType =
      this.convertContextDataToServiceParams(context);
    const model = this.aiServiceClient.getGenerativeModel({
      model: requestData.model,
    });
    const chat = model.startChat(requestData.startChatParams);
    const result = await chat.sendMessage(requestData.requestText);
    const response = await result.response;
    const text = response.text();
    return {
      aiStepData: {
        aiServiceRequestParams: requestData,
        aiServiceResponse: text,
      },
      answer: text,
    };
  }
}
