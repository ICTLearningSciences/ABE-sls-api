/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
// Note: had to add .js to find this file in serverless
import { APIGatewayEvent } from 'aws-lambda';
import { createResponseJson } from '../helpers.js';
import { wrapHandler } from '../sentry-helpers.js';
import { googleDocTextModify } from 'abe-sls-core-2';
export enum GoogleDocTextModifyActions {
  HIGHLIGHT = 'HIGHLIGHT',
  INSERT = 'INSERT',
  REMOVE = 'REMOVE',
}

// modern module syntax
export const handler = wrapHandler(async (event: APIGatewayEvent) => {
  const queryParams = event['queryStringParameters'];
  const action =
    queryParams && 'action' in queryParams ? queryParams['action'] : '';
  const targetText =
    queryParams && 'text' in queryParams ? queryParams['text'] : '';
  const docId =
    queryParams && 'docId' in queryParams ? queryParams['docId'] : '';
  const insertAfterText =
    queryParams && 'insertAfterText' in queryParams
      ? queryParams['insertAfterText']
      : '';

  if (!targetText) {
    return createResponseJson(400, {
      error: 'text is required query parameter',
    });
  }
  if (!docId) {
    return createResponseJson(400, {
      error: 'docId is a required query parameter',
    });
  }
  if (!action) {
    return createResponseJson(400, {
      error: 'action is a required query parameter',
    });
  }
  console.log(`action: ${action}, targetText: ${targetText}, docId: ${docId}`);
  try {
    await googleDocTextModify(action as any, targetText, docId, insertAfterText || '');
  } catch (e) {
    console.error(e);
    return createResponseJson(500, { error: JSON.stringify(e) });
  }

  return createResponseJson(200, {});
});
