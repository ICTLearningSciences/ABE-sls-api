/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { RagSearchResult } from 'cloud_services/generic_classes/rag/rag_query';
import { Schema } from 'jsonschema';

export interface DocData {
  plainText: string;
  markdownText: string;
  uriEncoded?: boolean;
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
  OPEN_AI_GPT_6_LUNA = 'gpt-6-luna',
  AZURE_GPT_6_LUNA = 'ABE-gpt-6-luna',
  GEMINI_4_ARGON = 'gemini-4-argon',
  GEMINI_3_8_FLASH = 'gemini-3.8-flash',
  SAGE_GPT_4O_MINI = 'gpt-4o-mini',
  SAGE_GPT_4 = 'gpt4',
  SAGE_GPT_4_GOV = 'gpt4-gov',
  SAGE_GPT_4O_GOV = 'gpt-4o-gov',

  ANTHROPIC_CLAUDE_5_5_SONNET = 'claude-sonnet-5-5',

  ANTHROPIC_CLAUDE_HAIKU_4_5 = 'claude-haiku-4-5-20251001',

  ANTHROPIC_CLAUDE_OPUS_4_8 = 'claude-opus-4-8',
}

export interface TargetAiModelServiceType {
  serviceName: string;
  model: string;
}

export interface AiPromptStep {
  prompts: PromptConfiguration[];
  targetAiServiceModel: TargetAiModelServiceType;
  systemRole?: string;
  ragConfiguration?: RagStoreConfiguration;
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
  ragData?: RagSearchResult[];
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

export enum RagStore {
  AZURE_RAG = 'AZURE_RAG',
  AWS_RAG = 'AWS_RAG',
}

export interface RagStoreConfiguration {
  ragQuery: string;
  topN: number;
  filters?: Record<string, string | string[]>;
}
