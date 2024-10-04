/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { expect } from "chai";
import { Express } from "express";
import jwt from "jsonwebtoken";
import path from "path";
import request from "supertest";
import requireEnv from "../src/helpers.js";
import nock from "nock";
import { textOpenAiResponse } from "./fixtures/documents/open-ai-responses.js";
import { ReverseOutline } from "../src/functions/timeline/functions/reverse-outline.js";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function fixturePath(p: string): string {
  return path.join(__dirname, "fixtures", p);
}

// duration of access token in seconds before it expires
export function accessTokenDuration(): number {
  return process.env.ACCESS_TOKEN_LENGTH
    ? parseInt(process.env.ACCESS_TOKEN_LENGTH)
    : 60 * 60 * 24 * 90;
}

export function getToken(userId: string, expiresIn?: number): string {
  if (!expiresIn) {
    expiresIn = accessTokenDuration();
  }
  const expirationDate = new Date(Date.now() + expiresIn * 1000);
  const accessToken = jwt.sign(
    { id: userId, expirationDate },
    requireEnv("JWT_SECRET"),
    { expiresIn: expirationDate.getTime() - new Date().getTime() }
  );
  return accessToken;
}

export interface GqlBody {
  query: string;
  variables?: Record<string, any>;
}

export interface AuthGqlArgs {
  app: Express;
  body: GqlBody;
  disableExpect200Response?: boolean;
  userId?: string;
}

const USER_ID_DEFAULT = "5f0cfea3395d762ca65405d3";
export async function authGql(args: AuthGqlArgs): Promise<request.Response> {
  const token = getToken(args.userId || USER_ID_DEFAULT);
  const response = await request(args.app)
    .post("/graphql")
    .set("Authorization", `bearer ${token}`)
    .send(args.body);
  if (!args.disableExpect200Response) {
    expect(response.status).to.equal(200);
  }
  return response;
}

export function mockExternalDocRevisionText(text: string){
  nock("https://docs.google.com/")
  .get(/\/feeds\/download\/.*/)
  .reply(200, {
      data: text
  });
}

export function mockDefault(){
  mockExternalDocRevisionText("fake-text")
}

export function mockGraphqlQuery(queryName: string, data: any){
  const GRAPHQL_ENDPOINT = requireEnv("GRAPHQL_ENDPOINT");
  return nock(GRAPHQL_ENDPOINT)
    .post("", req =>{
      return req.query.includes(queryName)
    })
    .reply(200, {
        data: data
    });
}

interface NockRequestData{
  calls: number,
  requestBodies: any[]
}

interface MockOpenAiCallOptions{
    interceptAllCalls?: boolean,
    delay?: number,
    statusCode?: number,
    /**
     * must be an object for js to pass by reference
     */
    requestData?: NockRequestData
}

/**
 * 
 * @param response data that will be returned in choices[0].message.content of the openAi response
 * @returns the scope of the nock call (can be used to check if called, etc.)
 */
export function mockOpenAiCall(response: string, options?: MockOpenAiCallOptions, requestBodyMatcher?: (body: any) =>boolean ): nock.Scope{
  const {interceptAllCalls, delay, statusCode} = options || {};
  const nockScope = nock("https://api.openai.com")
  const nockInterceptor = nockScope.post(/.*/ , (body: any)=>{
    options?.requestData && (options.requestData.requestBodies?.push(body))
    if(requestBodyMatcher){
      return requestBodyMatcher(body)
    }
    return true
  })
  if(interceptAllCalls){
    nockScope.persist()
  }

  if(delay){
    nockInterceptor.delay(delay)
  }

  if(Array.isArray(response)){
    response.forEach((r) => {
      nockInterceptor.reply(statusCode || 200, ()=>{
        options?.requestData && options.requestData.calls++;
        return textOpenAiResponse(r)
      });
    })
  }else{
      nockInterceptor.reply(statusCode || 200, ()=>{
        options?.requestData && options.requestData.calls++;
        return textOpenAiResponse(response)
      });
  }
  return nockScope
}


export function assertRequestIncludesMessage(expectedMessage: string, messages: any[]){
  expect(messages.find((m)=>{
    return m.content.includes(expectedMessage)
  })).to.not.be.undefined
}

export const defaultChangeSummaryRes = "mock change summary text"
export function mockOpenAiChangeSummaryResponse(response: string, options?: MockOpenAiCallOptions): [nock.Scope, NockRequestData]{
  let dataCollector = {
    calls: 0, // js object to force pass by reference
    requestBodies: [] as any[]
  }
  return [mockOpenAiCall(response, {...options, requestData: dataCollector},
  (body) => {
    return body.messages.find((m)=>{
      return m.content.includes("Please summarize")
    })
  }), dataCollector]
}

export const defaultReverseOutlineRes: ReverseOutline = {
  'Thesis Statement': 'fake thesis',
  'Supporting Claims': ['fake claims'],
  'Evidence Given for Each Claim': [
    {
    'Claim A': 'fake claim A',
    'Claim A Evidence': [
      'fake evidence A'
    ],
    'Claim B': 'fake claim B',
    'Claim B Evidence': [
      'fake evidence B'
    ]
  }
]
}

export function mockOpenAiReverseOutlineResponse(response: ReverseOutline, options?: MockOpenAiCallOptions): [nock.Scope, NockRequestData]{
  let dataCollector = {
    calls: 0, // js object to force pass by reference
    requestBodies: [] as any[]
  }
  return [mockOpenAiCall(JSON.stringify(response), {...options, requestData: dataCollector},
  (body) => {
    return body.messages.find((m)=>{
      return m.content.includes("Your task is to generate an outline for this writing.")
    })
  }), dataCollector]
}
