/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
// Note: had to add .js to find this file in serverless
import { HttpRequest, InvocationContext, HttpResponseInit, app } from "@azure/functions";
import { getDocRevisions } from 'abe-sls-core-2';
import { createResponseJson } from '../helpers.js';
// modern module syntax
export async function _getDocRevisions(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const docsId = request.params.docs_id;
  if (!docsId) {
    throw new Error('Google Doc ID is empty');
  }
  const revisions = await getDocRevisions(docsId);
  return createResponseJson(200, {
    revisions: revisions,
  });
}


app.http('getDocRevisions', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'doc_revisions/{docs_id}',
    extraOutputs: [],
    handler: _getDocRevisions,
});