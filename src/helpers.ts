/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { APIGatewayEvent } from 'aws-lambda';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import Sentry from './sentry-helpers.js';
import Validator from 'jsonschema';

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

export function isJsonString(str: string | undefined | null): boolean {
  if (!str) {
    return false;
  }
  try {
    JSON.parse(str);
  } catch (e) {
    console.log(`Error parsing string: ${str}`);
    return false;
  }
  return true;
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

export const exponentialBackoff = (
  maxRetries: number,
  delayMs: number,
  requestConfig: AxiosRequestConfig
): Promise<AxiosResponse> => {
  return new Promise((resolve, reject) => {
    const doRequest = (retryCount: number) => {
      if (retryCount > 0) {
        console.log(`Retrying request, retry count: ${retryCount}`);
        console.log(requestConfig);
      }
      axios(requestConfig)
        .then((response) => {
          resolve(response);
        })
        .catch((error) => {
          if (retryCount >= maxRetries) {
            reject(error);
            return;
          }
          const backoffTime = Math.pow(2, retryCount) * delayMs;
          setTimeout(() => {
            doRequest(retryCount + 1);
          }, backoffTime);
        });
    };
    doRequest(0); // Start with retryCount = 0
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateJsonResponse(response: string, schema: any): boolean {
  try {
    const v = new Validator.Validator();
    const responseJson = JSON.parse(response);
    const result = v.validate(responseJson, schema);
    if (result.errors.length > 0) {
      console.error(result.errors);
      throw new Error('invalid json response shape');
    }
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}
