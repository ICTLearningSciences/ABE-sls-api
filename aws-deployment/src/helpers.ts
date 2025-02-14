import Sentry from "./sentry-helpers.js";
import axios from "axios";
import { APIGatewayEvent } from "aws-lambda";
import {types, aiStepHelpers} from "abe-sls-core-2";


export type AuthHeaders = Record<string, string>;

export function createResponseJson(statusCode: number, body: any) {
    if (statusCode >= 400) {
      Sentry.captureException(`Error response: ${JSON.stringify(body)}`);
    }
    return {
      statusCode: statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        data: body,
      }),
    };
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

  export function getFieldFromEventBody<T>(
    event: APIGatewayEvent,
    field: string
  ): T {
    const body = event.body ? JSON.parse(event.body) : null;
    if (!body) {
      throw new Error('Body is empty');
    }
    try {
      return body[field];
    } catch (err) {
      throw new Error(`No ${field} in body`);
    }
  }

  export function extractOpenAiRequestData(
    event: APIGatewayEvent
  ): aiStepHelpers.ExtractedOpenAiRequestData {
    const docsId = event.queryStringParameters?.['docId'];
    const userId = event.queryStringParameters?.['userId'];
    const docService = event.queryStringParameters?.['docService'];
    const aiPromptSteps: types.AiPromptStep[] = getFieldFromEventBody<types.AiPromptStep[]>(
      event,
      'aiPromptSteps'
    );
    const authHeaders = aiStepHelpers.getAuthHeaders(event);
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
        ? (docService as types.DocServices)
        : types.DocServices.GOOGLE_DOCS,
    };
  }