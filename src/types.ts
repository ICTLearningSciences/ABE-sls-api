import OpenAI from "openai";

export interface DocData {
  plainText: string;
  lastChangedId: string;
  title: string;
  lastModifyingUser: string;
  modifiedTime: string;
}

export interface OpenAIReqRes{
  openAiPrompt: OpenAI.Chat.Completions.ChatCompletionCreateParams,
  openAiResponse: OpenAI.Chat.Completions.ChatCompletion.Choice[],
  originalRequestPrompts?: OpenAiPromptStep
}

export interface InputQuestionResponse extends OpenAIReqRes{
  answer: string
}

export interface SinglePromptResponse extends OpenAIReqRes{
  originalPromptConfigs: PromptConfiguration[]
}
  
/**
 * Multistep Prompt Types
 */
export interface OpenAiPromptResponse{
  openAiData: OpenAIReqRes[],
  answer: string,
}

export enum PromptRoles{
  SYSTEM='system',
  USER='user',
  ASSISSANT='assistant',
  FUNCTION='function'
}

export interface PromptConfiguration{
  promptText: string,
  includeEssay: boolean
  promptRole?: PromptRoles
}

export interface OpenAiPromptStep{
  prompts: PromptConfiguration[],
  outputDataType: PromptOutputTypes
}

export enum PromptOutputTypes{
  TEXT = "TEXT",
  JSON = "JSON"
}

export interface OpenAiStep{
  openAiPromptStringify: string,
  openAiResponseStringify: string
}

export interface GQLPromptRunResponse{
  googleDocId: string,
  user: string,
  promptConfiguration: PromptConfiguration[],
  openAiSteps: OpenAiStep[]
}

export enum OpenAiAsyncJobStatus{
  QUEUED = "QUEUED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETE = "COMPLETE",
  FAILED = "FAILED"
}

