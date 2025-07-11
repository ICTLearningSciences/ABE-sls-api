/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { docs_v1, drive_v3 } from 'googleapis';
import { DocData } from '../types.js';
import { DocService } from './abstract-doc-service.js';
import { getDocData as _getDocData } from '../api.js';
import { AuthHeaders } from '../shared_functions/ai_steps_request/helpers.js';
import {
  GoogleAPIs,
  UseWithGoogleApi,
  useWithGoogleApi as _useWithGoogleApi,
  findSubstringInParagraphs,
  inspectDocContent,
} from '../hooks/google_api.js';
import { IGDocVersion } from '../timeline-generation/types.js';
import { exponentialBackoff } from '../helpers.js';
import { AxiosRequestConfig } from 'axios';
import {
  DocEdit,
  DocEditAction,
  InsertTextAction,
  ModifyTextAction,
} from './helpers/edit-doc-helpers.js';

type GoogleDocVersion = drive_v3.Schema$Revision;

export class GoogleDocService extends DocService<GoogleDocVersion> {
  authHeaders: AuthHeaders;
  private static instance: GoogleDocService;
  useWithGoogleApi: UseWithGoogleApi;
  googleApi?: GoogleAPIs;

  constructor(authHeaders: AuthHeaders) {
    super();
    this.authHeaders = authHeaders;
    this.useWithGoogleApi = _useWithGoogleApi();
  }

  async getGoogleAPIs(): Promise<GoogleAPIs> {
    if (!this.googleApi) {
      this.googleApi = await this.useWithGoogleApi.getGoogleAPIs();
    }
    return this.googleApi;
  }

  async getDocData(docsId: string): Promise<DocData> {
    const { drive, docs } = await this.getGoogleAPIs();
    const docData = await this.useWithGoogleApi.getDocCurrentData(
      docs,
      drive,
      docsId
    );
    return docData;
  }

  static getInstance(authHeaders: AuthHeaders): DocService<GoogleDocVersion> {
    if (!GoogleDocService.instance) {
      GoogleDocService.instance = new GoogleDocService(authHeaders);
    }
    return GoogleDocService.instance;
  }

  fetchExternalDocVersion(docId: string): Promise<GoogleDocVersion[]> {
    return Promise.resolve([]);
  }

  async convertExternalDocVersionsToIGDocVersion(
    googleDocVersions: GoogleDocVersion[],
    lastRealVersion: IGDocVersion
  ): Promise<IGDocVersion[]> {
    if (!googleDocVersions.length) {
      return [];
    }
    const { accessToken: driveAccessToken } =
      await this.useWithGoogleApi.getGoogleAPIs();
    const requests: Promise<IGDocVersion | undefined>[] = googleDocVersions.map(
      async (googleDocVersion) => {
        if (!googleDocVersion['exportLinks']) {
          throw new Error('Google Doc revision exportLinks is empty');
        }
        const textUrl = googleDocVersion['exportLinks']['text/plain'];
        if (!textUrl) {
          throw new Error('Google Doc revision textUrl is empty');
        }
        const requestConfig: AxiosRequestConfig = {
          url: textUrl,
          method: 'get',
          headers: {
            Authorization: `Bearer ${driveAccessToken}`,
          },
        };
        const res = await exponentialBackoff(5, 1000, requestConfig);
        return {
          _id: googleDocVersion.id || '',
          docId: googleDocVersion.id || '',
          plainText: res.data || '',
          markdownText: res.data || '',
          lastChangedId: '',
          documentIntention: lastRealVersion.documentIntention,
          dayIntention: lastRealVersion.dayIntention,
          sessionId: '',
          chatLog: [],
          activity: '',
          intent: '',
          title: lastRealVersion.title,
          lastModifyingUser: '',
          modifiedTime: googleDocVersion.modifiedTime || '',
          createdAt: googleDocVersion.modifiedTime || '',
          updatedAt: googleDocVersion.modifiedTime || '',
        };
      }
    );
    const allRevisions = await Promise.all(requests);
    const revisions = allRevisions.filter((revision) => {
      return revision !== undefined;
    }) as IGDocVersion[];

    // TODO: upload these to graphql in batches
    return revisions;
  }

  async getDocContent(
    docId: string
  ): Promise<docs_v1.Schema$StructuralElement[]> {
    const { docs } = await this.getGoogleAPIs();
    const doc = await docs.documents.get({ documentId: docId });
    return doc.data.body?.content || [];
  }

  async buildHighlightRequest(
    docId: string,
    edit: ModifyTextAction
  ): Promise<docs_v1.Schema$Request> {
    const docContent = await this.getDocContent(docId);
    const paragraphData = inspectDocContent(docContent).paragraphData;
    const { startIndex, endIndex } = findSubstringInParagraphs(
      paragraphData,
      edit.targetText
    );

    if (startIndex == -1 || endIndex == -1) {
      throw new Error(`Could not find text ${edit.targetText} in doc ${docId}`);
    }

    const highlightRequest: docs_v1.Schema$Request = {
      updateTextStyle: {
        range: {
          startIndex: startIndex,
          endIndex: endIndex,
        },
        textStyle: {
          backgroundColor: {
            color: {
              rgbColor: {
                red: 1.0,
                green: 1.0,
                blue: 0.5,
              },
            },
          },
        },
        fields: 'backgroundColor',
      },
    };
    return highlightRequest;
  }

  /**
   * Inserts the text at the start of the doc
   */
  async buildInsertAtStartRequest(
    textToInsert: string
  ): Promise<docs_v1.Schema$Request> {
    const insertRequest: docs_v1.Schema$Request = {
      insertText: {
        text: textToInsert,
        location: {
          index: 1,
        },
      },
    };
    return insertRequest;
  }

  /**
   * Appends the text to the end of the doc
   */
  async buildInsertAtEndRequest(
    textToAppend: string
  ): Promise<docs_v1.Schema$Request> {
    const appendRequest: docs_v1.Schema$Request = {
      insertText: {
        text: textToAppend,
        endOfSegmentLocation: {
          segmentId: null,
        },
      },
    };
    return appendRequest;
  }

  async buildInsertAfterRequest(
    docId: string,
    edit: InsertTextAction
  ): Promise<docs_v1.Schema$Request> {
    if (!edit.insertAfterText) {
      throw new Error(`insertAfterText is required for insert after action`);
    }
    const docContent = await this.getDocContent(docId);
    const paragraphData = inspectDocContent(docContent).paragraphData;
    const { startIndex: insertAfterStartIndex, endIndex: insertAfterEndIndex } =
      findSubstringInParagraphs(paragraphData, edit.insertAfterText);
    if (insertAfterStartIndex == -1 || insertAfterEndIndex == -1) {
      throw new Error(
        `Could not find text ${edit.insertAfterText} in doc ${docId}`
      );
    }
    const insertAfterRequest: docs_v1.Schema$Request = {
      insertText: {
        text: edit.textToInsert,
        location: {
          index: insertAfterEndIndex,
        },
      },
    };
    return insertAfterRequest;
  }

  async buildRemoveRequest(
    docId: string,
    edit: ModifyTextAction
  ): Promise<docs_v1.Schema$Request> {
    const docContent = await this.getDocContent(docId);
    const paragraphData = inspectDocContent(docContent).paragraphData;
    const { startIndex, endIndex } = findSubstringInParagraphs(
      paragraphData,
      edit.targetText
    );
    if (startIndex == -1 || endIndex == -1) {
      throw new Error(`Could not find text ${edit.targetText} in doc ${docId}`);
    }
    const removeRequest: docs_v1.Schema$Request = {
      deleteContentRange: {
        range: {
          startIndex: startIndex,
          endIndex: endIndex,
        },
      },
    };
    return removeRequest;
  }

  async buildReplaceRequest(
    docId: string,
    edit: ModifyTextAction
  ): Promise<docs_v1.Schema$Request[]> {
    if (!edit.newText) {
      throw new Error(`newText is required for replace action`);
    }
    const textToReplace = edit.targetText;
    const docContent = await this.getDocContent(docId);
    const paragraphData = inspectDocContent(docContent).paragraphData;
    const { startIndex, endIndex } = findSubstringInParagraphs(
      paragraphData,
      edit.targetText
    );
    if (startIndex == -1 || endIndex == -1) {
      throw new Error(`Could not find text ${textToReplace} in doc ${docId}`);
    }
    const replaceRequest: docs_v1.Schema$Request[] = [
      {
        deleteContentRange: {
          range: {
            startIndex: startIndex,
            endIndex: endIndex,
          },
        },
      },
      {
        insertText: {
          text: edit.newText,
          location: {
            index: startIndex,
          },
        },
      },
    ];
    return replaceRequest;
  }

  async executeBatchUpdate(
    docsApi: docs_v1.Docs,
    docId: string,
    requests: docs_v1.Schema$Request[]
  ): Promise<void> {
    await docsApi.documents.batchUpdate({
      documentId: docId,
      requestBody: {
        requests: requests,
      },
    });
  }

  async handleDocEdits(docId: string, edits: DocEdit[]): Promise<void> {
    const { docs } = await this.getGoogleAPIs();
    console.log('edits', JSON.stringify(edits, null, 2));
    console.log(JSON.stringify(edits, null, 2));
    for (const edit of edits) {
      console.log(`executing edit: ${edit.action}`);
      switch (edit.action) {
        case DocEditAction.INSERT:
          if (!edit.insertTextAction) {
            throw new Error(`Insert text action is required for insert action`);
          }
          if (edit.insertTextAction.insertAfterText === '') {
            // insert at the start of the document
            const insertAtStartRequest = await this.buildInsertAtStartRequest(
              edit.insertTextAction.textToInsert
            );
            await this.executeBatchUpdate(docs, docId, [insertAtStartRequest]);
          } else {
            const insertAfterRequest = await this.buildInsertAfterRequest(
              docId,
              edit.insertTextAction
            );
            await this.executeBatchUpdate(docs, docId, [insertAfterRequest]);
          }
          break;
        case DocEditAction.HIGHLIGHT:
          if (!edit.modifyTextAction) {
            throw new Error(
              `modifyTextAction is required for highlight action`
            );
          }
          const highlightRequest = await this.buildHighlightRequest(
            docId,
            edit.modifyTextAction
          );
          await this.executeBatchUpdate(docs, docId, [highlightRequest]);
          break;
        case DocEditAction.REMOVE:
          if (!edit.modifyTextAction) {
            throw new Error(`modifyTextAction is required for remove action`);
          }
          const removeRequest = await this.buildRemoveRequest(
            docId,
            edit.modifyTextAction
          );
          await this.executeBatchUpdate(docs, docId, [removeRequest]);
          break;
        case DocEditAction.REPLACE:
          if (!edit.modifyTextAction) {
            throw new Error(`modifyTextAction is required for replace action`);
          }
          const replaceRequest = await this.buildReplaceRequest(
            docId,
            edit.modifyTextAction
          );
          await this.executeBatchUpdate(docs, docId, replaceRequest);
          break;
        default:
          throw new Error(`Unknown edit action: ${edit.action}`);
      }
    }
  }
}
