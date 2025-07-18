/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { Schema } from 'jsonschema';

export interface DocData {
  plainText: string;
  markdownText: string;
  lastChangedId: string;
  title: string;
  lastModifyingUser: string;
  modifiedTime: string;
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

export enum DefaultGptModels {
  OPEN_AI_GPT_4 = 'gpt-4',
  OPEN_AI_GPT_4_TURBO_PREVIEW = 'gpt-4-turbo-preview',
  OPEN_AI_GPT_4o_MINI = 'gpt-4o-mini',
  OPEN_AI_GPT_4o = 'gpt-4o',
  AZURE_GPT_4_TURBO_PREVIEW = 'ABE-gpt-4o',
  AZURE_GPT_4_TURBO_PREVIEW_MINI = 'ABE-gpt-4o-mini',
  GEMINI_1_PRO = 'gemini-pro',
  GEMINI_1_5_PREVIEW = 'gemini-1.5-pro-latest',
  GEMINI_2_0_PREVIEW = 'gemini-2.0-flash',
  CAMO_GPT_MISTRAL_7B = 'Mistral7B',
  SAGE_GPT_4O_MINI = 'gpt-4o-mini',
  SAGE_GPT_4 = 'gpt4',
  SAGE_GPT_4_GOV = 'gpt4-gov',
  SAGE_GPT_4O_GOV = 'gpt-4o-gov',

  ANTHROPIC_CLAUDE_3_5_SONNET_LATEST = 'claude-3-5-sonnet-latest',
  ANTHROPIC_CLAUDE_3_7_SONNET_LATEST = 'claude-3-7-sonnet-latest',
  ANTHROPIC_CLAUDE_4_SONNET_LATEST = 'claude-sonnet-4-0',

  ANTHROPIC_CLAUDE_3_HAIKU_20240307 = 'claude-3-haiku-20240307',
  ANTHROPIC_CLAUDE_3_5_HAIKU_LATEST = 'claude-3-5-haiku-latest',

  ANTHROPIC_CLAUDE_3_OPUS_LATEST = 'claude-3-opus-latest',
  ANTHROPIC_CLAUDE_4_OPUS_20250514 = 'claude-opus-4-20250514',
}

export const AnthropicModelMaxTokens = {
  [DefaultGptModels.ANTHROPIC_CLAUDE_3_5_SONNET_LATEST]: 8192,
  [DefaultGptModels.ANTHROPIC_CLAUDE_3_7_SONNET_LATEST]: 64000,
  [DefaultGptModels.ANTHROPIC_CLAUDE_4_SONNET_LATEST]: 64000,

  [DefaultGptModels.ANTHROPIC_CLAUDE_3_HAIKU_20240307]: 4096,
  [DefaultGptModels.ANTHROPIC_CLAUDE_3_5_HAIKU_LATEST]: 8192,

  [DefaultGptModels.ANTHROPIC_CLAUDE_3_OPUS_LATEST]: 4096,
  [DefaultGptModels.ANTHROPIC_CLAUDE_4_OPUS_20250514]: 32000,
};

export interface TargetAiModelServiceType {
  serviceName: string;
  model: string;
}

export interface AiPromptStep {
  prompts: PromptConfiguration[];
  targetAiServiceModel: TargetAiModelServiceType;
  systemRole?: string;
  outputDataType: PromptOutputTypes;
  responseSchema?: Schema;
  responseFormat?: string;
  webSearch?: boolean;
  editDoc?: boolean;
}

export type AiRequestContextPrompt = Omit<PromptConfiguration, 'includeEssay'>;

export interface AiRequestContext {
  aiStep: AiPromptStep;
  docsPlainText: string;
  previousOutput: string;
}

export enum PromptOutputTypes {
  TEXT = 'TEXT',
  JSON = 'JSON',
}

export interface GQLPromptRunResponse {
  googleDocId: string;
}

export enum AiAsyncJobStatus {
  QUEUED = 'QUEUED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETE = 'COMPLETE',
  FAILED = 'FAILED',
}

export enum DocServices {
  GOOGLE_DOCS = 'GOOGLE_DOCS',
  MICROSOFT_WORD = 'MICROSOFT_WORD',
  RAW_TEXT = 'RAW_TEXT',
}
