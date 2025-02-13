/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
// Note: had to add .js to find this file in serverless
import { DynamoDBStreamEvent } from 'aws-lambda';
import { wrapHandler } from '../../sentry-helpers.js';
import { asyncDocumentTimelineProcess } from 'abe-sls-core';
import { DocServices, TargetAiModelServiceType } from 'abe-sls-core/dist/types.js';
interface ExtractedDocumentTimelineRequestData {
  docId: string;
  userId: string;
  targetAiService: TargetAiModelServiceType;
  docService: DocServices;
}

// modern module syntax
export const handler = wrapHandler(async (event: DynamoDBStreamEvent) => {
  const records = event.Records.filter(
    (record) => record.eventName === 'INSERT' && record.dynamodb?.NewImage
  );
  for (let record of records) {
    const newImage = record.dynamodb?.NewImage;
    const requestData = newImage?.timelineRequestData.S;
    const docTimelineRequestData:
      | ExtractedDocumentTimelineRequestData
      | undefined = requestData ? JSON.parse(requestData) : undefined;
    const jobId = newImage?.id?.S;
    if (!docTimelineRequestData || !jobId) {
      console.error(
        'docTimelineRequestData/jobId not found in dynamo db record'
      );
      continue;
    }
    try {
      await asyncDocumentTimelineProcess(jobId, docTimelineRequestData);
    } catch (err) {
      throw err;
    }
  }
});
