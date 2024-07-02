import { APIGatewayEvent } from "aws-lambda";
import { Schema } from "jsonschema";
import { getFieldFromEventBody } from "../../helpers.js";
import { PromptOutputTypes, PromptRoles, TargetAiModelServiceType } from "types";

export interface PromptConfiguration {
    promptText: string;
    promptRole?: PromptRoles;
  }

export interface GenericLlmRequest{
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
    const llmRequest: GenericLlmRequest = getFieldFromEventBody<GenericLlmRequest>(
      event,
      'llmRequest'
    );

    return {
      llmRequest
    };
  }