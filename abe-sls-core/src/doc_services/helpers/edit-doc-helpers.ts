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

export interface InsertTextAction {
  textToInsert: string;
  insertAfterText: string;
}

export interface ModifyTextAction {
  targetText: string;
  newText?: string;
}

export interface DocEdit {
  action: DocEditAction;
  insertTextAction?: InsertTextAction;
  modifyTextAction?: ModifyTextAction;
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
    - If the user asks a question, do not edit the document, leave the edits array empty, just respond to the user's question (in the responseMessage field).
    - For any "replace" action, the "targetText" must NOT contain newline characters. Replacements must be single-line.
    - Insertions can contain newlines.
    - If a user requests to replace/remove multi-line text, split it into multiple "replace" or "remove" actions, each handling one line at a time.

RESPONSE FORMAT:
Respond in JSON. Validate that your response is valid JSON. Do NOT include JSON markdown. Your JSON MUST follow this format:
    {
      "edits": [
        {
          "action": string,
          "insertTextAction": { // if action is "insert", this object is required, else leave empty
            "textToInsert": string,
            "insertAfterText": string,
          },
          "modifyTextAction": { // if action is "replace", "remove", or "highlight", this object is required, else leave empty
            "newText": string,
            "targetText": string,
          }
        }
      ],
      "responseMessage": string
    }

JSON FIELD DEFINITIONS:
edits: The list of edits to make to the document, if any. Leave this array empty if the user asks a question.
action: The supported action that we are executing. Values: "insert", "replace", "remove", "highlight"
insertTextAction: ONLY for when the "action" is "insert". This object contains information for the insert action.
  - textToInsert: The text to insert into the document. Do NOT include markdown formatting.
  - insertAfterText: This is a text to insert after. If we are inserting at the start of the document, then leave empty. The insertAfterText must be exact text from the user's essay. ENSURE that the after text in the location makes sense, i.e. if adding a new item to a list, the after text should be the last item in the list. Or if inserting at the end of the document, the after text should be the last text in the document.
modifyTextAction: ONLY for when the "action" is "replace", "remove", or "highlight". This object contains information for the modify action.
  - newText: ONLY used when "action" is "replace". The text to replace the "targetText" with.
  - targetText: The exact text to remove, replace, or highlight. Must contain exact text from the essay. IMPORTANT: MUST NOT INCLUDE NEWLINES, handle separate lines as separate text.
responseMessage: Short, clear explanation of the edits made, no JSON here. If the user asks a question, you may respond to the question here.
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
