import { APIGatewayEvent } from 'aws-lambda';
import { getFieldFromEventBody } from '../../helpers.js';
import { OpenAiPromptStep } from '../../types.js';

export type AuthHeaders = Record<string, string>;

export function getAuthHeaders(event: APIGatewayEvent): AuthHeaders {
  const authToken =
    'headers' in event && 'Authorization' in event['headers']
      ? event['headers']['Authorization']
      : null;
  if (!authToken) {
    throw new Error('Auth headers are empty');
  }
  return { Authorization: authToken };
}

export enum OpenAiActions {
  ASK_QUESTION = 'ASK_QUESTION',
  MULTISTEP_PROMPTS = 'MULTISTEP_PROMPTS',
  SINGLE_PROMPT = 'SINGLE_PROMPT',
}

export const ValidOpenAiModels = [
  'gpt-4',
  'gpt-4-0314',
  'gpt-4-0613',
  'gpt-4-32k',
  'gpt-4-32k-0314',
  'gpt-4-32k-0613',
  'gpt-3.5-turbo',
  'gpt-3.5-turbo-16k',
  'gpt-3.5-turbo-0301',
  'gpt-3.5-turbo-0613',
  'gpt-3.5-turbo-16k-0613',
];

export interface ExtractedOpenAiRequestData {
  docsId: string;
  userId: string;
  systemPrompt: string;
  openAiModel: string;
  openAiPromptSteps: OpenAiPromptStep[];
  authHeaders: AuthHeaders;
}

export function extractOpenAiRequestData(
  event: APIGatewayEvent
): ExtractedOpenAiRequestData {
  const docsId = event.queryStringParameters?.['docId'];
  const userId = event.queryStringParameters?.['userId'];
  const systemPrompt = event.queryStringParameters?.['systemPrompt'] || '';
  const openAiModel = event.queryStringParameters?.['openAiModel'] || '';
  const openAiPromptSteps: OpenAiPromptStep[] = getFieldFromEventBody<
    OpenAiPromptStep[]
  >(event, 'openAiPromptSteps');
  const authHeaders = getAuthHeaders(event);
  if (!docsId) {
    throw new Error('Google Doc ID is empty');
  }
  if (!userId) {
    throw new Error('User ID is empty');
  }
  if (!openAiPromptSteps) {
    throw new Error('OpenAI Prompt Steps are empty');
  }
  if (openAiModel && !ValidOpenAiModels.includes(openAiModel)) {
    throw new Error('invalid OpenAI model');
  }
  return {
    docsId,
    userId,
    systemPrompt,
    openAiModel,
    openAiPromptSteps,
    authHeaders,
  };
}
