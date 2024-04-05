/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import OpenAI from 'openai';

export interface DocData {
  plainText: string;
  lastChangedId: string;
  title: string;
  lastModifyingUser: string;
  modifiedTime: string;
}

export interface OpenAIReqRes {
  openAiPrompt: OpenAI.Chat.Completions.ChatCompletionCreateParams;
  openAiResponse: OpenAI.Chat.Completions.ChatCompletion.Choice[];
  originalRequestPrompts?: OpenAiPromptStep;
}

export interface InputQuestionResponse extends OpenAIReqRes {
  answer: string;
}

export interface SinglePromptResponse extends OpenAIReqRes {
  originalPromptConfigs: PromptConfiguration[];
}

/**
 * Multistep Prompt Types
 */
export interface OpenAiPromptResponse {
  openAiData: OpenAIReqRes[];
  answer: string;
}

export enum PromptRoles {
  SYSTEM = 'system',
  USER = 'user',
  ASSISSANT = 'assistant',
  FUNCTION = 'function',
}

export interface PromptConfiguration {
  promptText: string;
  includeEssay: boolean;
  promptRole?: PromptRoles;
}

export enum GptModels {
  GPT_3_5 = 'gpt-3.5-turbo-16k',
  GPT_4 = 'gpt-4',
}

export interface OpenAiPromptStep {
  prompts: PromptConfiguration[];
  targetGptModel: GptModels;
  outputDataType: PromptOutputTypes;
}

export enum PromptOutputTypes {
  TEXT = 'TEXT',
  JSON = 'JSON',
}

export interface OpenAiStep {
  openAiPromptStringify: string;
  openAiResponseStringify: string;
}

export interface GQLPromptRunResponse {
  googleDocId: string;
  user: string;
  promptConfiguration: PromptConfiguration[];
  openAiSteps: OpenAiStep[];
}

export enum OpenAiAsyncJobStatus {
  QUEUED = 'QUEUED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETE = 'COMPLETE',
  FAILED = 'FAILED',
}
