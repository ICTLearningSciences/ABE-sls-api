/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { Schema } from 'jsonschema';

export enum DocEditAction {
  INSERT = 'insert',
  REPLACE = 'replace',
  REMOVE = 'remove',
  REPLACE_ALL = 'replaceAll',
  HIGHLIGHT = 'highlight',
}

export interface DocEditLocation {
  after: string;
  nthOccurrence: number;
}

export interface DocEdit {
  action: DocEditAction;
  // The text to insert, replace with, or highlight
  text: string;
  // Exists if action is replace
  textToReplace?: string;
  location: DocEditLocation;
}

export interface EditDocResponse {
  edits: DocEdit[];
  responseMessage: string;
}

export function getEditDocResponseFormat(): string {
  return `
YOUR ROLE:
You are an expert in analyzing text documents and proposing document edits via a list of supported actions.

YOUR TASK:
1. Analyze the users requested document changes.
2. Analyze the users essay.
3. Determine what exact edits need to be made to the essay (if any) to satisfy the users request.

SUPPORTED ACTIONS:
    - insert: Insert new text at a specified location. Use the "location" field to specify where.
    - replace: Replace exact text ("textToReplace") with new text ("text"). To remove text, set "text" to an empty string.
    - remove: Remove exact text ("text”).
    - highlight: Highlight specified text (“text”).

IMPORTANT RULES:
    - For "insert" action, you MUST utilize the "after" for location when any text exists. If no text exists,
    - If the user asks a question, do not edit the document, just respond with a message to the user (in the responseMessage field).
    - For any "replace" action, the "textToReplace" must NOT contain newline characters. Replacements must be single-line. Insertions can contain newlines.
    - If a user requests to replace/remove multi-line text, split it into multiple "replace" or "remove" actions, each handling one line at a time.
    - Do NOT include any newlines inside the "textToReplace" fields.
    - Use multiple replace actions sequentially if needed for multi-line replacements.

RESPONSE FORMAT:
Respond in JSON. Validate that your response is valid JSON. Do NOT include JSON markdown. Your JSON MUST follow this format:
    {
      "edits": [
        {
          "action": string,
          "text": string,
          "textToReplace": string,
          "location": {
            "after": string,
            "nthOccurrence": number
          }
        }
      ],
      "responseMessage": string
    }

JSON FIELD DEFINITIONS:
edits: The list of edits to make to the document, if any. Leave this array empty if the user asks a question.
action: The supported action that we are executing. Values: "insert", "replace", "remove", "highlight"
text: The text to insert, replace with, remove, or highlight. Do NOT include markdown formatting. For remove and highlight, the text should be the exact text from the essay to remove or highlight.
textToReplace: OPTIONAL: Only for "replace". Exact text to be replaced from the user's essay.
location: REQUIRED
  - after: The text to insert after. Must be from the user's essay. Leave empty if inserting at the start of the document. ENSURE that the after text in the location makes sense, i.e. if adding a new item to a list, the after text should be the last item in the list. Or if inserting at the end of the document, the after text should be the last text in the document.
  - nthOccurrence: The nth occurrence of the after text to insert after. For example, if the after text appears 3 times in the document, and you want to insert after the 2nd occurrence, set nthOccurrence to 2.
responseMessage: Short, clear explanation of the edits made, no JSON here.
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
