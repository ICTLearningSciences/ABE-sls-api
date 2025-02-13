/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

// Note: had to add .js to find this file in serverless
import { AiServiceFinalResponseType } from '../../ai_services/ai-service-factory.js';
import { DocumentDBFactory } from '../../cloud_services/generic_classes/document_db/document_db_factory.js';

// modern module syntax
export const aiStepsJobStatus = async (jobId: string) => {
  if (!jobId) {
    throw new Error('jobId query string parameter is required');
  }
  const documentDBManager = DocumentDBFactory.getDocumentDBManagerInstance();
  try {
    const data = await documentDBManager.getItem(jobId);
    const jobStatus = data.job_status;
    const apiError = data.api_error;
    const answer = data.answer;
    const aiServiceResponse: AiServiceFinalResponseType | null =
      data.aiServiceResponse ? JSON.parse(data.aiServiceResponse) : null;
    return {
      aiServiceResponse,
      answer,
      jobStatus,
      apiError,
    };
  } catch (err) {
    console.error(err);
    throw err;
  }
};
