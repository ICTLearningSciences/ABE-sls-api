/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
// Note: had to add .js to find this file in serverless
import {
  AiAsyncJobStatus,
  DocServices,
  TargetAiModelServiceType,
} from '../../types.js';
import { DocumentTimelineGenerator } from '../../timeline-generation/document-timeline-generator.js';
import { DocServiceFactory } from '../../doc_services/doc-service-factory.js';
import { extractErrorMessageFromError } from '../../helpers.js';
import { DocumentDBFactory } from '../../cloud_services/generic_classes/document_db/document_db_factory.js';
interface ExtractedDocumentTimelineRequestData {
  docId: string;
  userId: string;
  targetAiService: TargetAiModelServiceType;
  docService: DocServices;
}

// modern module syntax
export const asyncDocumentTimelineProcess = async (
  jobId: string,
  docTimelineRequestData: ExtractedDocumentTimelineRequestData
) => {
  const documentDBManager = DocumentDBFactory.getDocumentDBManagerInstance();
  if (!docTimelineRequestData || !jobId) {
    console.error(
      'docTimelineRequestData/jobId not found in provided request data'
    );
    throw new Error(
      'docTimelineRequestData/jobId not found in provided request data'
    );
  }
  try {
    await documentDBManager.setTimelineJobInProgress(jobId);
    const { docId, userId, targetAiService, docService } =
      docTimelineRequestData;
    const docServiceInstance = DocServiceFactory.getDocService(docService, {});
    const externalGoogleDocRevisions =
      await docServiceInstance.fetchExternalDocVersion(docId);
    const docTimelineGenerator = new DocumentTimelineGenerator(targetAiService);
    await docTimelineGenerator.getDocumentTimeline(
      jobId,
      userId,
      docId,
      externalGoogleDocRevisions,
      docServiceInstance
    );
  } catch (err) {
    await documentDBManager.timelineProcessFailed(
      jobId,
      extractErrorMessageFromError(err)
    );
    throw err;
  }
};
