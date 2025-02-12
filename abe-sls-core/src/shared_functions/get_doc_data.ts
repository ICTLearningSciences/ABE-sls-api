/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { DocServiceFactory } from '../doc_services/doc-service-factory.js';
import { DocServices } from '../types.js';

// modern module syntax
export const getDocData = async (
  docsId?: string,
  docService?: DocServices
) => {
  if (!docsId || !docService) {
    throw new Error('Google Doc ID or Doc Service is empty');
  }

  if (Object.values(DocServices).indexOf(docService as DocServices) === -1) {
    throw new Error('Invalid Doc Service');
  }

  const docHandler = DocServiceFactory.getDocService(
    docService as DocServices,
    {}
  );
  const docData = await docHandler.getDocData(docsId);
  return docData;
};
