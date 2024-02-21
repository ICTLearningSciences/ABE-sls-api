import { APIGatewayEvent } from "aws-lambda";
import axios from "axios";

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