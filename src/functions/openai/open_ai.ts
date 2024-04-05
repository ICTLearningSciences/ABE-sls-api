/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
// Note: had to add .js to find this file in serverless
import OpenAI from 'openai';
import { useWithOpenAI } from '../../hooks/use-with-open-ai.js';
import {
  createResponseJson,
  extractErrorMessageFromError,
  getFieldFromEventBody,
} from '../../helpers.js';
import { OpenAiPromptStep } from '../../types.js';
import { APIGatewayEvent } from 'aws-lambda';

export type AuthHeaders = Record<string, string>;

function getAuthHeaders(event: APIGatewayEvent): AuthHeaders {
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

const ValidOpenAiModels = [
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

// modern module syntax
export const handler = async (event: APIGatewayEvent) => {
  const {
    docsId,
    userId,
    systemPrompt,
    openAiModel,
    openAiPromptSteps,
    authHeaders,
  } = extractOpenAiRequestData(event);
  const { askAboutGDoc } = useWithOpenAI();
  try {
    const openAiResponse = await askAboutGDoc(
      docsId,
      userId,
      openAiPromptSteps,
      systemPrompt,
      authHeaders,
      openAiModel,
      ''
    );
    return createResponseJson(200, { response: openAiResponse });
  } catch (err) {
    if (err instanceof OpenAI.APIError) {
      return createResponseJson(500, {
        message: `OpenAI API Error: ${err.message}`,
      });
    }
    return createResponseJson(500, {
      message: extractErrorMessageFromError(err),
    });
  }
};
