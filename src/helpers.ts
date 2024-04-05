import { APIGatewayEvent } from "aws-lambda";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

export function createResponseJson(statusCode: number, body: any) {
  return {
    statusCode: statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
    },
    body: JSON.stringify({
      data: body
    }),
  }
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
  if(!str) {
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

export function getFieldFromEventBody<T>(event: APIGatewayEvent, field: string): T {
  const body = event.body ? JSON.parse(event.body) : null;
  if(!body){
    throw new Error('Body is empty');
  }
  try{
    return body[field];
  }catch(err){
    throw new Error(`No ${field} in body`);
  }
}

export const exponentialBackoff = (maxRetries: number, delayMs: number, requestConfig: AxiosRequestConfig): Promise<AxiosResponse> => {
  return new Promise((resolve, reject) => {
      const doRequest = (retryCount: number) => {
          if(retryCount > 0){
              console.log(`Retrying request, retry count: ${retryCount}`);
              console.log(requestConfig)
          }
          axios(requestConfig)
              .then(response => {
                  resolve(response);
              })
              .catch(error => {
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