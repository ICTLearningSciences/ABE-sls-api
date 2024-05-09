/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { Schema } from 'jsonschema';

export interface DocData {
  plainText: string;
  lastChangedId: string;
  title: string;
  lastModifyingUser: string;
  modifiedTime: string;
}

export interface AIReqRes {
  aiServiceRequestParams: string; // OpenAI.Chat.Completions.ChatCompletionCreateParams for OpenAi
  aiServiceResponse: string; // OpenAI.Chat.Completions.ChatCompletion.Choice[] for OpenAi
}

export interface InputQuestionResponse extends AIReqRes {
  answer: string;
}

export interface SinglePromptResponse extends AIReqRes {
  originalPromptConfigs: PromptConfiguration[];
}

/**
 * Multistep Prompt Types
 */
export interface AiPromptResponse {
  aiReqResData: AIReqRes[];
  answer: string;
}

export enum PromptRoles {
  SYSTEM = 'system',
  USER = 'user',
  ASSISSANT = 'assistant',
}

export interface PromptConfiguration {
  promptText: string;
  includeEssay: boolean;
  promptRole?: PromptRoles;
}

export enum GptModels {
  OPEN_AI_GPT_3_5 = 'gpt-3.5-turbo-16k',
  OPEN_AI_GPT_4 = 'gpt-4',
  OPEN_AI_GPT_4_TURBO_PREVIEW = 'gpt-4-turbo-preview',
  AZURE_GPT_3_5 = 'ABE-GPT-3_5_turbo_16k',
  AZURE_GPT_4_TURBO_PREVIEW = 'ABE-gpt-4-turbo-preview',
}

export enum AvailableAiServices {
  OPEN_AI = 'OPEN_AI',
  AZURE_OPEN_AI = 'AZURE_OPEN_AI',
}

export interface AiPromptStep {
  prompts: PromptConfiguration[];
  targetGptModel: GptModels;
  customSystemRole?: string;
  outputDataType: PromptOutputTypes;
  responseSchema?: Schema;
}

export type AiRequestContextPrompt = Omit<PromptConfiguration, 'includeEssay'>;

export interface AiRequestContext {
  aiStep: AiPromptStep;
  docsPlainText: string;
  previousOutput: string;
  systemRole: string;
}

export enum PromptOutputTypes {
  TEXT = 'TEXT',
  JSON = 'JSON',
}

export interface AiStep {
  aiServiceRequestParams: string;
  aiServiceResponse: string;
}

export interface GQLPromptRunResponse {
  googleDocId: string;
  user: string;
  promptConfiguration: PromptConfiguration[];
  aiSteps: AiStep[];
}

export enum AiAsyncJobStatus {
  QUEUED = 'QUEUED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETE = 'COMPLETE',
  FAILED = 'FAILED',
}
