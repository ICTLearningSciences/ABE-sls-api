/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
// Note: had to add .js to find this file in serverless
import OpenAI from 'openai';
import { useWithAiService } from '../../hooks/use-with-ai-service.js';
import {
  createResponseJson,
  extractErrorMessageFromError,
} from '../../helpers.js';
import { APIGatewayEvent } from 'aws-lambda';
import { extractOpenAiRequestData } from './helpers.js';
import { AvailableAiServices, GptModels } from '../../types.js';

// modern module syntax
export const handler = async (event: APIGatewayEvent) => {
  const {
    docsId,
    userId,
    systemPrompt,
    openAiModel,
    aiPromptSteps,
    authHeaders,
  } = extractOpenAiRequestData(event);
  const { executeAiSteps } = useWithAiService();
  try {
    const aiServiceResponse = await executeAiSteps(
      aiPromptSteps,
      docsId,
      userId,
      authHeaders,
      systemPrompt,
      openAiModel as GptModels,
      AvailableAiServices.OPEN_AI
    );
    return createResponseJson(200, { response: aiServiceResponse });
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
