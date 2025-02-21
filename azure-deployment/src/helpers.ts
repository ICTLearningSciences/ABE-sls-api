import { HttpRequest, HttpResponseInit } from "@azure/functions";
import { GenericLlmRequest } from "abe-sls-core-2/dist/generic_llm_request/helpers.js";
import { GenericLlmRequestData } from "abe-sls-core-2/dist/generic_llm_request/helpers.js";
import { ExtractedOpenAiRequestData } from "abe-sls-core-2/dist/shared_functions/ai_steps_request/helpers.js";
import { AiPromptStep, DocServices } from "abe-sls-core-2/dist/types.js";
import * as axios from "axios";

export type AuthHeaders = Record<string, string>;

export function createResponseJson(statusCode: number, body: any): HttpResponseInit {
  return {
    status: statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true',
    },
    jsonBody: body,
  };
}

export async function extractGenericRequestData(
  request: HttpRequest
): Promise<GenericLlmRequestData> {
  const llmRequest: GenericLlmRequest =
    await getFieldFromEventBody<GenericLlmRequest>(request, 'llmRequest');

  return { llmRequest }
}


export function getAuthHeaders(request: HttpRequest): AuthHeaders {
    console.log(request.headers)
  const authToken = request.headers.get('authorization');
    if (!authToken) {
      throw new Error('Auth headers are empty');
    }
    return { Authorization: authToken as string };
  }
  
    export function extractErrorMessageFromError(err: any | unknown): string {
      if (err instanceof Error) {
        return err.message;
      } else if (axios.isAxiosError(err)) {
        return err.response?.data || err.message;
      } else {
        try {
          const error = JSON.stringify(err);
          return error;
        } catch (err) {
          return 'Cannot stringify error, unknown error structure';
        }
      }
    }
    
    export default function requireEnv(name: string): string {
      const val = process.env[name];
      if (val) {
        return val;
      }
      throw new Error(
        `required env variable '${name}' is not defined. Make sure .env file exists in root and has ${name} set`
      );
    }
  
    export async function getFieldFromEventBody<T>(
      request: HttpRequest,
      field: string
    ): Promise<T> {
      const body = await request.json();
      if (!body) {
        throw new Error('Body is empty');
      }
      console.log(body)
      try {
        return body[field];
      } catch (err) {
        throw new Error(`No ${field} in body`);
      }
    }
  

export async function extractOpenAiRequestData(
    request: HttpRequest
  ): Promise<ExtractedOpenAiRequestData> {
    const docsId = request.query.get('docId');
    const userId = request.query.get('userId');
    const docService = request.query.get('docService');
    const aiPromptSteps: AiPromptStep[] = await getFieldFromEventBody<AiPromptStep[]>(
      request,
      'aiPromptSteps'
    );
    const authHeaders = getAuthHeaders(request);
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
      docService: docService
        ? (docService as DocServices)
        : DocServices.GOOGLE_DOCS,
    };
  }