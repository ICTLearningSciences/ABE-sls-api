/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
// Note: had to add .js to find this file in serverless
import { AiAsyncJobStatus } from '../../types.js';
import { extractErrorMessageFromError } from '../../helpers.js';
import { AiServiceHandler } from '../../hooks/ai-service-handler.js';
import { DocumentDBFactory } from '../../cloud_services/generic_classes/document_db/document_db_factory.js';
import { GenericLlmRequestData } from '../../generic_llm_request/helpers.js';
// modern module syntax
export const genericRequestProcess = async (
  jobId: string,
  requestData: GenericLlmRequestData
) => {
  const { llmRequest } = requestData;
  const aiServiceHandler = new AiServiceHandler();
  const documentDBManager = DocumentDBFactory.getDocumentDBManagerInstance();
  try {
    await documentDBManager.setGenericRequestJobInProgress(jobId);
    const aiServiceResponse =
      await aiServiceHandler.executeGenericLlmRequest(llmRequest);
    // Update the job in dynamo db
    await documentDBManager.genericProcessFinished(jobId, aiServiceResponse);
  } catch (err) {
    await documentDBManager.genericProcessFailed(
      jobId,
      extractErrorMessageFromError(err)
    );
    throw err;
  }
};
