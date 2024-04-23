import OpenAI from 'openai';
import { DEFAULT_GPT_MODEL } from '../../constants.js';
import { executeOpenAiUntilProperResponse } from '../../hooks/use-with-open-ai.js';
import { GQLIGDocVersion } from './types.js';
import { Schema } from 'jsonschema';

const reverseOutlineSchema: Schema = {
  type: 'object',
  properties: {
    'Thesis Statement': {
      type: 'string',
    },
    'Supporting Claims': {
      type: 'array',
      items: {
        type: 'string',
      },
    },
    'Evidence Given for Each Claim': {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          'Claim A': {
            type: 'string',
          },
          'Claim A Evidence': {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          'Claim B': {
            type: 'string',
          },
          'Claim B Evidence': {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
      },
    },
  },
  required: [
    'Thesis Statement',
    'Supporting Claims',
    'Evidence Given for Each Claim',
  ],
};

export async function reverseOutlinePromptRequest(
  currentVersion: GQLIGDocVersion
) {
  const params: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
    messages: [
      { role: 'assistant', content: currentVersion.plainText },
      {
        role: 'system',
        content: `You are a literary and scholarly expert and have been evaluating university-level essays and thesis statements. You have been invited as an evaluation judge of writing, where a detailed and specific evaluation is expected.
  
              Your task is to generate an outline for this writing. This outline should have a logical inverted pyramid structure. First, identify the most likely thesis statement for that essay. For the thesis statement, I want you to evaluate the claims that made to support the thesis statement. Based on this goal and the format below, list each main point.
              
              {
                  “Thesis Statement”: str ,
                  // return the most likely thesis statement from the essay
                  “Supporting Claims” : [str]
                  // List of key claims that are needed to support this thesis 
                  “Evidence Given for Each Claim” : [ // array
                   { 
                      "Claim A": str,   // The first primary claim that supports the thesis statement.
                          "Claim A Evidence": [str]  // List of evidence provided for this claim,
                      "Claim B": str,   // The first primary claim that supports the thesis statement.
                          "Claim B Evidence": [str]  // List of evidence provided for this claim,
                  }
                ]
              }
              You must respond as JSON following the format above. Only respond using valid JSON. The thesis statement, claims, and evidence must all be described in briefly (20 words or less). Please check that the JSON is valid and follows the format given.
              
              The essay you are rating is given below:
              ----------------------------------------------
              `,
      },
    ],
    model: DEFAULT_GPT_MODEL,
  };
  const [res, answer] = await executeOpenAiUntilProperResponse(
    params,
    true,
    reverseOutlineSchema
  );
  return answer;
}
