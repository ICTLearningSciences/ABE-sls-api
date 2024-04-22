/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { APIGatewayEvent } from 'aws-lambda';
import { useWithGetDocumentTimeline } from './use-with-get-document-timeline.js';
import { createResponseJson } from '../../helpers.js';
import { useWithGoogleApi } from '../../hooks/google_api.js';
import { wrapHandler } from '../../sentry-helpers.js';

// modern module syntax
export const handler = wrapHandler(async (event: APIGatewayEvent) => {
  const documentId = event.queryStringParameters?.['docId'];
  const userId = event.queryStringParameters?.['userId'];
  if (!documentId || !userId) {
    throw new Error('Missing required query parameters [docId, userId]');
  }

  const { getGoogleAPIs, getGoogleDocVersions } = useWithGoogleApi();
  const { drive, docs, accessToken } = await getGoogleAPIs();
  const revisions = await getGoogleDocVersions(
    drive,
    documentId,
    accessToken || ''
  );
  const { getDocumentTimeline } = useWithGetDocumentTimeline();
  const documentTimeline = await getDocumentTimeline(
    userId,
    documentId,
    revisions,
    accessToken || ''
  );
  return createResponseJson(200, documentTimeline);
});
