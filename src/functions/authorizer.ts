/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import jwt from 'jsonwebtoken';
import requireEnv from '../helpers.js';
import Sentry, { wrapHandler } from '../sentry-helpers.js';

const JWT_SECRET = requireEnv('JWT_SECRET');

function extract_token_from_header(request: any) {
  if (request['type'] != 'TOKEN' || !('authorizationToken' in request)) {
    throw new Error('no authentication token provided');
  }
  const bearerToken: string = request['authorizationToken'];
  const tokenAuthentication = bearerToken.toLowerCase().startsWith('bearer ');
  const tokenSplit = bearerToken.split(' ');
  if (!tokenAuthentication || tokenSplit.length == 1) {
    throw new Error('no authentication token provided');
  }
  const token = tokenSplit[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    return payload;
  } catch (err) {
    throw new Error('invalid authentication token');
  }
}

export const handler = wrapHandler(async (event: any) => {
  try {
    const payload = extract_token_from_header(event);
    return {
      principalId: 'apigateway.amazonaws.com',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            // Resource: methodArn,  # this resulted in random aws request denied:
            // https://forums.aws.amazon.com/thread.jspa?messageID=937251&#937251
            Resource: '*',
          },
        ],
      },
      context: {
        token: JSON.stringify(payload),
      },
    };
  } catch (err) {
    Sentry.captureException(err);
    return {
      principalId: '*',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: '*',
            Effect: 'Deny',
            Resource: '*',
          },
        ],
      },
    };
  }
});
