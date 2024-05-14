/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { APIGatewayEvent } from 'aws-lambda';
import { getFieldFromEventBody } from '../../helpers.js';
import { AiPromptStep, TargetAiModelServiceType } from '../../types.js';
import { AvailableAiServiceNames } from '../../ai_services/ai-service-factory.js';

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
  aiPromptSteps: AiPromptStep[];
  authHeaders: AuthHeaders;
}

export function extractOpenAiRequestData(
  event: APIGatewayEvent
): ExtractedOpenAiRequestData {
  const docsId = event.queryStringParameters?.['docId'];
  const userId = event.queryStringParameters?.['userId'];
  const aiPromptSteps: AiPromptStep[] = getFieldFromEventBody<AiPromptStep[]>(
    event,
    'aiPromptSteps'
  );
  const authHeaders = getAuthHeaders(event);
  if (!docsId) {
    throw new Error('Google Doc ID is empty');
  }
  if (!userId) {
    throw new Error('User ID is empty');
  }
  if (!aiPromptSteps) {
    throw new Error('OpenAI Prompt Steps are empty');
  }
  return {
    docsId,
    userId,
    aiPromptSteps,
    authHeaders,
  };
}
