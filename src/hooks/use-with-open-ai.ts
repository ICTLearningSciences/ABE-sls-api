/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import OpenAI from 'openai';
import {
  OPENAI_DEFAULT_TEMP,
  RETRY_ATTEMPTS,
  MAX_OPEN_AI_CHAIN_REQUESTS,
  DEFAULT_GPT_MODEL,
  UPDATE_DYNAMO_ANSWER_THRESHOLD,
  MAX_DYNAMO_PUT_REQUESTS,
} from '../constants.js';
import { getDocData } from '../api.js';
import {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
} from 'openai/resources/index.js';
import {
  InputQuestionResponse,
  OpenAiPromptResponse,
  PromptConfiguration,
  PromptOutputTypes,
  PromptRoles,
  OpenAiPromptStep,
  SinglePromptResponse,
  OpenAIReqRes,
  OpenAiAsyncJobStatus,
} from '../types.js';
import { storePromptRun } from './graphql_api.js';
import requireEnv, { isJsonString } from '../helpers.js';
import { DynamoDB, UpdateItemCommandInput } from '@aws-sdk/client-dynamodb';
import { v4 as uuid } from 'uuid';
import { AuthHeaders } from '../functions/openai/helpers.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30 * 1000, // 30 seconds (default is 10 minutes)
});

const jobsTableName = requireEnv('JOBS_TABLE_NAME');

const temparature = OPENAI_DEFAULT_TEMP;
const dynamoDbClient = new DynamoDB({ region: 'us-east-1' });

async function updateDynamoAnswer(answer: string, dynamoJobId: string) {
  const tableRequest: UpdateItemCommandInput = {
    TableName: jobsTableName,
    Key: {
      id: {
        S: dynamoJobId,
      },
    },
    UpdateExpression: 'set answer = :answer',
    ExpressionAttributeValues: {
      ':answer': {
        S: answer,
      },
    },
  };
  await dynamoDbClient.updateItem(tableRequest).catch((err) => {
    console.error(err);
  });
}

export async function executeOpenAi(
  params: ChatCompletionCreateParamsNonStreaming
) {
  let id = uuid();
  console.log(
    `Executing OpenAI request ${id} starting at ${new Date().toISOString()}`
  );
  const result = await openai.chat.completions.create(params);
  if (!result.choices.length) {
    throw new Error('OpenAI API Error: No choices provided.');
  }
  const answer = result.choices[0].message.content;
  if (!answer) {
    throw new Error('OpenAI API Error: No response message content.');
  }
  console.log(
    `Executing OpenAI request ${id} ending at ${new Date().toISOString()}`
  );
  return result;
}

interface ExecutePromptSyncRes {
  reqRes: OpenAIReqRes;
  answer: string;
}

async function executeOpenAiPromptStepStream(
  curOpenAiStep: OpenAiPromptStep,
  docsPlainText: string,
  systemPrompt: string,
  openAiModel: string,
  dynamoJobId: string,
  previousOutput: string
): Promise<ExecutePromptSyncRes> {
  const messages: ChatCompletionMessageParam[] = [];
  messages.push({
    role: 'system',
    content: curOpenAiStep.customSystemRole || systemPrompt,
  });
  if (previousOutput) {
    messages.push({ role: 'assistant', content: previousOutput });
  }
  curOpenAiStep.prompts.forEach((prompt) => {
    const role = prompt.promptRole || PromptRoles.USER;
    const content = prompt.promptText;
    if (prompt.includeEssay) {
      messages.push({
        role: PromptRoles.SYSTEM,
        content: `\n\nHere is the users essay: -----------\n\n${docsPlainText}`,
      });
    }
    messages.push({ role, content });
  });
  const params: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
    messages: messages,
    model: openAiModel || curOpenAiStep.targetGptModel || DEFAULT_GPT_MODEL,
    stream: true,
  };
  console.log(
    `Executing OpenAI stream request ${dynamoJobId} starting at ${new Date().toISOString()}`
  );
  const stream = await openai.chat.completions.create(params);
  let answer = '';
  let previouslyStoredAnswer = '';
  let numPuts = 0;
  for await (const chunk of stream) {
    const newContent = chunk.choices[0].delta.content;
    if (newContent === undefined || newContent === null) {
      continue;
    }
    answer += newContent;
    const newAnswerLength = answer.length;
    if (
      newAnswerLength - previouslyStoredAnswer.length >
      UPDATE_DYNAMO_ANSWER_THRESHOLD * (numPuts + 1)
    ) {
      previouslyStoredAnswer = answer;
      numPuts++;
      if (numPuts >= MAX_DYNAMO_PUT_REQUESTS) {
        console.log('Exceeded max number of dynamo put requests');
      } else {
        await updateDynamoAnswer(answer, dynamoJobId);
      }
    }
  }
  console.log(
    `Executing OpenAI stream request ${dynamoJobId} ending at ${new Date().toISOString()}`
  );
  return {
    reqRes: {
      openAiPrompt: params,
      openAiResponse: [
        {
          message: {
            content: answer,
            role: 'assistant',
          },
          finish_reason: 'stop',
          index: 0,
          logprobs: null,
        },
      ],
      originalRequestPrompts: curOpenAiStep,
    },
    answer,
  };
}
async function executeOpenAiPromptStepSync(
  curOpenAiStep: OpenAiPromptStep,
  docsPlainText: string,
  systemPrompt: string,
  openAiModel: string,
  previousOutput: string
): Promise<ExecutePromptSyncRes> {
  const messages: ChatCompletionMessageParam[] = [];
  messages.push({
    role: 'system',
    content: curOpenAiStep.customSystemRole || systemPrompt,
  });
  if (previousOutput) {
    messages.push({ role: 'assistant', content: previousOutput });
  }
  curOpenAiStep.prompts.forEach((prompt) => {
    const role = prompt.promptRole || PromptRoles.USER;
    const content = prompt.promptText;
    if (prompt.includeEssay) {
      messages.push({
        role: PromptRoles.SYSTEM,
        content: `\n\nHere is the users essay: -----------\n\n${docsPlainText}`,
      });
    }
    messages.push({ role, content });
  });
  const params: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
    messages: messages,
    model: openAiModel || curOpenAiStep.targetGptModel || DEFAULT_GPT_MODEL,
  };

  let result = await executeOpenAi(params);
  let answer = result.choices[0].message.content;
  if (curOpenAiStep.outputDataType == PromptOutputTypes.JSON) {
    console.log('validating output is json');
    let isJsonResponse = isJsonString(answer);
    if (!isJsonResponse) {
      for (let j = 0; j < RETRY_ATTEMPTS; j++) {
        console.log(`Attempt ${j}`);
        if (isJsonResponse) {
          break;
        }
        const newParams: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
          ...params,
          temperature: temparature + j * 0.1,
        };
        result = await executeOpenAi(newParams);
        answer = result.choices[0].message.content;
        if (!answer) {
          throw new Error('OpenAI API Error: No response message content.');
        }
        isJsonResponse = isJsonString(answer);
      }
    }
    if (!isJsonResponse) {
      throw new Error(
        `OpenAI API Error: No valid JSON response after ${RETRY_ATTEMPTS} attempts.`
      );
    }
  }

  if (!answer) {
    throw new Error('OpenAI API Error: No response message content.');
  }

  return {
    reqRes: {
      openAiPrompt: params,
      openAiResponse: result.choices,
      originalRequestPrompts: curOpenAiStep,
    },
    answer,
  };
}

export function useWithOpenAI() {
  async function asyncAskAboutGDoc(
    docsId: string,
    userId: string,
    openAiPromptSteps: OpenAiPromptStep[],
    systemPrompt: string,
    authHeaders: AuthHeaders,
    openAiModel: string,
    dynamoJobId: string
  ): Promise<OpenAiPromptResponse> {
    const response = await openAiMultistepPrompts(
      openAiPromptSteps,
      docsId,
      userId,
      authHeaders,
      systemPrompt,
      openAiModel,
      dynamoJobId
    );
    return response;
  }

  async function askAboutGDoc(
    docsId: string,
    userId: string,
    openAiPromptSteps: OpenAiPromptStep[],
    systemPrompt: string,
    authHeaders: AuthHeaders,
    openAiModel: string,
    dynamoJobId: string
  ): Promise<OpenAiPromptResponse> {
    return openAiMultistepPrompts(
      openAiPromptSteps,
      docsId,
      userId,
      authHeaders,
      systemPrompt,
      openAiModel,
      dynamoJobId
    );
  }

  /**
   * Handles multistep prompts which use the output of the previous prompt as the input for the next prompt.
   * Each individual prompt does not know what the previous prompt was.
   */
  async function openAiMultistepPrompts(
    openAiSteps: OpenAiPromptStep[],
    docsId: string,
    userId: string,
    authHeaders: AuthHeaders,
    systemPrompt: string,
    openAiModel: string,
    dynamoJobId: string
  ): Promise<OpenAiPromptResponse> {
    if (openAiSteps.length >= MAX_OPEN_AI_CHAIN_REQUESTS) {
      throw new Error(
        `Please limit the number of prompts to ${MAX_OPEN_AI_CHAIN_REQUESTS} or less`
      );
    }
    const openAiResponses: OpenAiPromptResponse = {
      openAiData: [],
      answer: '',
    };
    const docsContent = await getDocData(docsId, authHeaders);
    const docsPlainText = docsContent.plainText;
    let previousOutput = '';
    for (let i = 0; i < openAiSteps.length; i++) {
      const isLastStep = i == openAiSteps.length - 1;

      const curOpenAiStep = openAiSteps[i];
      if (!isLastStep) {
        const { reqRes, answer } = await executeOpenAiPromptStepSync(
          curOpenAiStep,
          docsPlainText,
          systemPrompt,
          openAiModel,
          previousOutput
        );
        openAiResponses.openAiData.push(reqRes);
        previousOutput = answer;
        openAiResponses.answer = answer;
      } else {
        const { reqRes, answer } = await executeOpenAiPromptStepStream(
          curOpenAiStep,
          docsPlainText,
          systemPrompt,
          openAiModel,
          dynamoJobId,
          previousOutput
        );
        openAiResponses.openAiData.push(reqRes);
        openAiResponses.answer = answer;
      }
    }
    try {
      await storePromptRun(
        docsId,
        userId,
        openAiSteps,
        openAiResponses.openAiData
      );
    } catch (err) {
      console.error('Failed to store prompt run in gql');
      console.log(err);
    } finally {
      return openAiResponses;
    }
  }

  return {
    askAboutGDoc,
    asyncAskAboutGDoc,
  };
}
