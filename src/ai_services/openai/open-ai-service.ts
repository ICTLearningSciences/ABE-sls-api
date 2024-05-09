import OpenAI from "openai";
import { AiRequestContext, GptModels, PromptOutputTypes, PromptRoles } from "../../types.js";
import { AiService, CompleteChatResponse } from "../abstract-classes/abstract-ai-service.js";
import {
    ChatCompletionCreateParamsNonStreaming,
  } from 'openai/resources/index.js';
  import { v4 as uuid } from 'uuid';
import { Schema } from "jsonschema";
import { isJsonString, validateJsonResponse } from "../../helpers.js";
import { AI_DEFAULT_TEMP, RETRY_ATTEMPTS } from "../../constants.js";

export const DefaultOpenAiConfig = {
    DEFAULT_SYSTEM_ROLE: "You are ChatGPT, a large language model trained by OpenAI, based on the GPT-3.5 architecture. Knowledge cutoff: 2021-09.",
    DEFAULT_GPT_MODEL: GptModels.OPEN_AI_GPT_3_5,
}

export class OpenAiService extends AiService {
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
              const newParams: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
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

    async executeOpenAi(
        params: ChatCompletionCreateParamsNonStreaming
      ) {
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
    ): ChatCompletionCreateParamsNonStreaming{
      const {openAiStep, docsPlainText, systemRole, previousOutput} = requestContext;
      const request: ChatCompletionCreateParamsNonStreaming = {
        messages: [],
        model: overrideModel || openAiStep.targetGptModel || DefaultOpenAiConfig.DEFAULT_GPT_MODEL,
      };
      request.messages.push({
        role: PromptRoles.SYSTEM,
        content: systemRole || DefaultOpenAiConfig.DEFAULT_SYSTEM_ROLE,
      })
      if(previousOutput){
        request.messages.push({
          role: PromptRoles.ASSISSANT,
          content: `Here is the previous output: ---------- \n\n ${previousOutput}`,
        });
      }
      openAiStep.prompts.forEach((prompt) => {
        let text = prompt.promptText;
        if(prompt.includeEssay){
          text += `\n\nHere is the users essay: -----------\n\n${docsPlainText}`
        }
        request.messages.push({
          role: prompt.promptRole || PromptRoles.USER,
          content: text,
        });
      })
  
      return request;
    }


    async completeChat(context: AiRequestContext, overrideModel?: GptModels): Promise<CompleteChatResponse> {
        const params = this.convertContextDataToServiceParams(context, overrideModel);
        const [chatCompleteResponse, answer] = await this.executeAiUntilProperData(params, context.openAiStep.outputDataType == PromptOutputTypes.JSON, context.openAiStep.responseSchema);

        return {
            reqParamsString: JSON.stringify(params),
            responseString: JSON.stringify(chatCompleteResponse),
            answer: answer,
        };
    }

}