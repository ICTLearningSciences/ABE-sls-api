/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
// Note: had to add .js to find this file in serverless
import requireEnv, {
  createResponseJson,
  getFieldFromEventBody,
} from '../../helpers.js';

import {
  AiAsyncJobStatus,
  DocServices,
  TargetAiModelServiceType,
} from '../../types.js';
import { APIGatewayEvent } from 'aws-lambda';
import { v4 as uuid } from 'uuid';
import { wrapHandler } from '../../sentry-helpers.js';
import { getDocumentDBManager } from 'cloud_services/generic_classes/helpers.js';
// modern module syntax
export const handler = wrapHandler(async (event: APIGatewayEvent) => {
  const documentId = event.queryStringParameters?.['docId'];
  const userId = event.queryStringParameters?.['userId'];
  const docService =
    event.queryStringParameters?.['docService'] || DocServices.GOOGLE_DOCS;
  const targetAiService: TargetAiModelServiceType = getFieldFromEventBody(
    event,
    'targetAiService'
  );
  if (!documentId || !userId || !targetAiService) {
    throw new Error(
      'Missing required query parameters [docId, userId, targetAiService]'
    );
  }
  // Queue the job
  const newUuid = uuid();
  // Store the job in dynamo db, triggers async lambda
  const documentDBManager = getDocumentDBManager();
  try {
    await documentDBManager.storeNewItem(newUuid, {
      id: newUuid,
      job_status: AiAsyncJobStatus.IN_PROGRESS,
      documentTimeline: '',
      timelineRequestData: JSON.stringify({
        docId: documentId,
        userId,
        targetAiService,
        docService,
      }),
    });
    return createResponseJson(200, { response: { jobId: newUuid } });
  } catch (err) {
    console.error(err);
    return createResponseJson(500, {
      response: { error: 'Failed to add job to dynamo db' },
    });
  }
});
