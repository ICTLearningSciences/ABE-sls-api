/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { Schema } from 'jsonschema';

export enum DocEditAction {
  INSERT = 'insert',
  APPEND = 'append',
  REMOVE = 'remove',
  REPLACE = 'replace',
  REPLACE_ALL = 'replaceAll',
  HIGHLIGHT = 'highlight',
}

export interface DocEdit {
  action: DocEditAction;
  // The text to insert, append, remove, replace with, or highlight
  text: string;
  // Exists if action is replace
  textToReplace?: string;
}

export interface EditDocResponse {
  edits: DocEdit[];
  responseMessage: string;
}

export function getEditDocResponseFormat(): string {
  return `
    Respond in JSON. Validate that your response is valid JSON. Your JSON must follow this format:
    {
      "edits": [ // a list of edits to make to the document
        {
          "action": string // Values: "insert", "append", "remove", "replace", "replaceAll", "highlight"
          "text": string // The text to insert, append, remove, replace/replaceAll with, or highlight
          "textToReplace": string // OPTIONAL: The text to be replaced, only include this if the action is "replace"
        }
      ],
      "responseMessage": string // A message to the user explaining the edits that were made. Do NOT include any JSON in this field. Keep it somewhat short and concise.
    }
    `;
}

export const editDocResponseSchema: Schema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    edits: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: Object.values(DocEditAction) },
          text: { type: 'string' },
          textToReplace: { type: 'string' },
        },
        required: ['action', 'text'],
        additionalProperties: false,
      },
      additionalProperties: false,
    },
    responseMessage: { type: 'string' },
  },
  required: ['edits', 'responseMessage'],
  additionalProperties: false,
};
