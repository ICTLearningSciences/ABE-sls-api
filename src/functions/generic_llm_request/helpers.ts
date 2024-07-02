/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { APIGatewayEvent } from 'aws-lambda';
import { Schema } from 'jsonschema';
import { getFieldFromEventBody } from '../../helpers.js';
import {
  PromptOutputTypes,
  PromptRoles,
  TargetAiModelServiceType,
} from '../../types.js';

export interface PromptConfiguration {
  promptText: string;
  promptRole?: PromptRoles;
}

export interface GenericLlmRequest {
  prompts: PromptConfiguration[];
  targetAiServiceModel: TargetAiModelServiceType;
  outputDataType: PromptOutputTypes;
  systemRole?: string;
  responseSchema?: Schema;
  responseFormat?: string;
}

export interface GenericLlmRequestData {
  llmRequest: GenericLlmRequest;
}

export function extractGenericRequestData(
  event: APIGatewayEvent
): GenericLlmRequestData {
  const llmRequest: GenericLlmRequest =
    getFieldFromEventBody<GenericLlmRequest>(event, 'llmRequest');

  return {
    llmRequest,
  };
}
