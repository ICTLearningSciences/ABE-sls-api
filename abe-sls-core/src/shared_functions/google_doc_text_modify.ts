/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
// Note: had to add .js to find this file in serverless
import { useWithGoogleApi } from '../hooks/google_api.js';

export enum GoogleDocTextModifyActions {
  HIGHLIGHT = 'HIGHLIGHT',
  INSERT = 'INSERT',
  REMOVE = 'REMOVE',
}

// modern module syntax
export const googleDocTextModify = async (
  action: GoogleDocTextModifyActions,
  targetText: string,
  docId: string,
  insertAfterText: string
) => {
  const {
    getGoogleAPIs,
    highlightGoogleDocText,
    removeGoogleDocText,
    insertGoogleDocText,
  } = useWithGoogleApi();
  const { drive, docs } = await getGoogleAPIs();

  console.log(`action: ${action}, targetText: ${targetText}, docId: ${docId}`);
  try {
    if (action === GoogleDocTextModifyActions.HIGHLIGHT) {
      await highlightGoogleDocText(docs, docId, targetText);
    } else if (action === GoogleDocTextModifyActions.REMOVE) {
      await removeGoogleDocText(docs, docId, targetText);
    } else if (action === GoogleDocTextModifyActions.INSERT) {
      if (!insertAfterText) {
        throw new Error(
          'insertAfterText is required query parameter for inserting'
        );
      }
      await insertGoogleDocText(docs, docId, targetText, insertAfterText);
    } else {
      throw new Error(
        'action must be one of: ' +
          Object.values(GoogleDocTextModifyActions).join(', ')
      );
    }
  } catch (e) {
    console.error(e);
    throw e;
  }
};
