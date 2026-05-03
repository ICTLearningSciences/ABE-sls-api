/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
// Note: had to add .js to find this file in serverless
import { APIGatewayEvent } from 'aws-lambda';
import { createResponseJson, createResponseBinary } from '../helpers.js';
import { wrapHandler } from '../sentry-helpers.js';
import { getRagData } from 'abe-sls-core-2';


// modern module syntax
export const handler = wrapHandler(async (event: APIGatewayEvent) => {
  const queryParams = event['queryStringParameters'];
  const ragDocLocation = queryParams && 'ragDocLocation' in queryParams ? queryParams['ragDocLocation'] : '';


  if (!ragDocLocation) {
    return createResponseJson(400, {
      error: 'ragDocLocation is required query parameter',
    });
  }
  console.log(`ragDocLocation ${ragDocLocation}`);
  try {
   const ragData = await getRagData(ragDocLocation);
   console.log(ragData)
   return createResponseBinary(200, ragData.mimeType, ragData.data);
  } catch (e) {
    console.error(e);
    return createResponseJson(500, { error: JSON.stringify(e) });
  }

});
