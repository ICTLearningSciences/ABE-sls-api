/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { GQLIGDocVersion } from './types.js';
import { Schema } from 'jsonschema';
import {
  AiRequestContext,
  AiPromptStep,
  PromptOutputTypes,
  PromptRoles,
} from '../types.js';
import { AvailableAiServices } from '../ai_services/ai-service-factory.js';

export interface ReverseOutline {
  'Thesis Statement': string;
  'Supporting Claims': string[];
  'Evidence Given for Each Claim': {
    'Claim A': string;
    'Claim A Evidence': string[];
    'Claim B': string;
    'Claim B Evidence': string[];
  }[];
}

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
  currentVersion: GQLIGDocVersion,
  aiService: AvailableAiServices,
  outlineKeyframe?: string
) {
  if (outlineKeyframe) {
    // last 20 characters of the previous reverse outline
    console.log(
      currentVersion.plainText.substring(currentVersion.plainText.length - 20)
    );
    console.log(outlineKeyframe);
  }
  const aiStep: AiPromptStep = {
    prompts: [
      {
        promptRole: PromptRoles.USER,
        promptText: `You are a literary and scholarly expert and have been evaluating university-level essays and thesis statements. You have been invited as an evaluation judge of writing, where a detailed and specific evaluation is expected.
  
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
              Even if there is no data in the essay, you MUST still output the format above, do not include ANY text other than the JSON response.
              `,
        includeEssay: true,
      },
      ...(outlineKeyframe
        ? [
            {
              promptText: `Use this previous reverse outline as the base for generating the new reverse outline: ${outlineKeyframe}`,
              includeEssay: false,
              promptRole: PromptRoles.USER,
            },
          ]
        : []),
    ],
    targetAiServiceModel: aiService.defaultAiServiceModel,
    responseSchema: reverseOutlineSchema,
    outputDataType: PromptOutputTypes.JSON,
  };

  const aiReqContext: AiRequestContext = {
    aiStep: aiStep,
    docsPlainText: currentVersion.plainText,
    previousOutput: '',
  };

  const res = await aiService.completeChat(aiReqContext);
  return res.answer;
}
