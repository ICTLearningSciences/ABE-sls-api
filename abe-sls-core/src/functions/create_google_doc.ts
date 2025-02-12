/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
// Note: had to add .js to find this file in serverless
import { APIGatewayEvent } from 'aws-lambda';
import { createResponseJson } from '../helpers.js';
import { useWithGoogleApi } from '../hooks/google_api.js';
import { storeGoogleDoc } from '../hooks/graphql_api.js';
import { wrapHandler } from '../sentry-helpers.js';
export const handler = wrapHandler(async (event: APIGatewayEvent) => {
  const { getGoogleAPIs, createGoogleDoc } = useWithGoogleApi();
  const { drive, docs } = await getGoogleAPIs();
  const queryParams = event['queryStringParameters'];
  const adminEmails: string[] = process.env.ADMIN_EMAILS
    ? process.env.ADMIN_EMAILS.split(',')
    : [];
  const userId =
    queryParams && 'userId' in queryParams ? queryParams['userId'] : '';
  const userEmails =
    queryParams && 'emails' in queryParams && queryParams['emails']
      ? queryParams['emails'].split(',').filter((e: string) => e)
      : [];
  const copyFromDocId =
    queryParams && 'copyFromDocId' in queryParams
      ? queryParams['copyFromDocId']
      : '';
  const newDocTitle =
    queryParams && 'newDocTitle' in queryParams
      ? queryParams['newDocTitle']
      : '';
  const isAdminDoc =
    queryParams && 'isAdminDoc' in queryParams ? queryParams['isAdminDoc'] : '';
  if (!userId) {
    return createResponseJson(400, { error: 'userId is required' });
  }
  const { docId, webViewLink, createdTime } = await createGoogleDoc(
    drive,
    [...adminEmails, ...userEmails],
    copyFromDocId || '',
    newDocTitle || ''
  );
  await storeGoogleDoc(docId, userId, isAdminDoc === 'true', newDocTitle);
  return createResponseJson(200, {
    docId: docId,
    userId: userId,
    docUrl: webViewLink,
    createdTime: createdTime,
  });
});
