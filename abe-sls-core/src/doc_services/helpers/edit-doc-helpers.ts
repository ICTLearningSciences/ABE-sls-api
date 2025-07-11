/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { Schema } from 'jsonschema';

export enum DocEditActions {
  INSERT_PARAGRAPH = 'insert_paragraph',
  MODIFY_PARAGRAPH = 'modify_paragraph',
  HIGHLIGHT_PHRASE_IN_PARAGRAPH = 'highlight_phrase_in_paragraph',
}

export interface DocEditAction {
  action: DocEditActions;
}

export interface InsertParagraphAction extends DocEditAction {
  action: DocEditActions.INSERT_PARAGRAPH;
  location: {
    where: 'start_of_document' | 'end_of_document' | 'after_paragraph';
    afterParagraphId?: string;
  };
  newParagraphText: string;
}

export interface ModifyParagraphAction extends DocEditAction {
  action: DocEditActions.MODIFY_PARAGRAPH;
  paragraphId: string;
  newParagraphText: string;
}

export interface HighlightPhraseInParagraphAction extends DocEditAction {
  action: DocEditActions.HIGHLIGHT_PHRASE_IN_PARAGRAPH;
  paragraphId: string;
  phrase: string;
}

export interface EditDocResponse {
  actions: DocEditAction[];
  responseMessage: string;
}

export function getEditDocResponseFormat(): string {
  return `
    YOUR ROLE:
    You are an expert in analyzing text documents and determining the location of text in the document.

    SUPPORTED ACTIONS:
    - insert_paragraph: Insert a new paragraph at a specified location.
    - modify_paragraph: Modify an existing paragraph.
    - highlight_phrase_in_paragraph: Highlight a specific phrase in a paragraph.

    Your Task:
    1. Determine which paragraph(s) must be modified to satisfy the users request.
    2. Modify the relevant paragraphs.
      - When you need to alter the text of a paragraph (removal, replacement, inserting new text into paragraph, etc.), you must use the "modify_paragraph" action.
    3. Output JSON:
    {
      "actions": [
        {
          "action": string, // one of the following: "insert_paragraph", "modify_paragraph", "highlight_phrase_in_paragraph"
          "insert_paragraph": {
            "location": {
              "where": string, // one of the following: "start_of_document", "end_of_document", "after_paragraph"
              "afterParagraphId": string?, // OPTIONAL: If inserting after a paragraph, the id of the paragraph to insert after
            },
            "newParagraphText": string,
          },
          "modify_paragraph": {
            "paragraphId": string,
            "newParagraphText": string,
          },
          "highlight_phrase_in_paragraph": {
            "paragraphId": string,
            "phrase": string,
          },
        }
      ],
      "responseMessage": string // simple message containing info about the edits you performed
    }
    `;
}

export const editDocResponseSchema: Schema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    actions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: Object.values(DocEditActions) },
          insert_paragraph: {
            type: 'object',
            properties: {
              location: {
                type: 'object',
                properties: {
                  where: {
                    type: 'string',
                    enum: [
                      'start_of_document',
                      'end_of_document',
                      'after_paragraph',
                    ],
                  },
                  afterParagraphId: { type: 'string' },
                },
                required: ['where'],
              },
              newParagraphText: { type: 'string' },
            },
            required: ['location', 'newParagraphText'],
          },
          modify_paragraph: {
            type: 'object',
            properties: {
              paragraphId: { type: 'string' },
              newParagraphText: { type: 'string' },
            },
            required: ['paragraphId', 'newParagraphText'],
          },
          highlight_phrase_in_paragraph: {
            type: 'object',
            properties: {
              paragraphId: { type: 'string' },
              phrase: { type: 'string' },
            },
            required: ['paragraphId', 'phrase'],
          },
        },
        required: ['action'],
        additionalProperties: false,
      },
      additionalProperties: false,
    },
    responseMessage: { type: 'string' },
  },
  required: ['actions', 'responseMessage'],
  additionalProperties: false,
};
