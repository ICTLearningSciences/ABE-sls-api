/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import dotenv from "dotenv";
import { fixturePath } from "./helpers.js";
import { before, after } from "mocha";
import { mockClient } from "aws-sdk-client-mock";
import nock from "nock";
import { DynamoDBManager } from "../src/cloud_services/aws/dynamo_db_manager";
import { DocumentDBFactory } from "../src/cloud_services/generic_classes/document_db/document_db_factory.js";

const documentDBManager = DocumentDBFactory.getDocumentDBManagerInstance() as unknown as DynamoDBManager;
export const ddbMock = mockClient(documentDBManager.dynamoDbClient);

before(() => {
  dotenv.config({ path: fixturePath(".env") });
  process.env.DOTENV_PATH = fixturePath(".env");
  ddbMock.reset();
});

after(async () => {
  // After ALL tests are done
});

afterEach(() => {
    nock.cleanAll();
    ddbMock.reset();
})

// When creating DynamoDBManager in tests, no need to pass client:
const dbManager = new DynamoDBManager();
