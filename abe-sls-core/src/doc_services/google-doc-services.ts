/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { docs_v1, drive_v3 } from 'googleapis';
import { DocData } from '../types.js';
import { DocEdit, DocEditAction, DocService } from './abstract-doc-service.js';
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
    const docData = await this.useWithGoogleApi.getDocCurrentData(docs, drive, docsId);
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

  async buildHighlightRequest(docId: string, docContent: docs_v1.Schema$StructuralElement[], textToHighlight: string): Promise<docs_v1.Schema$Request> {
    const paragraphData = inspectDocContent(docContent).paragraphData;
    const { startIndex, endIndex } = findSubstringInParagraphs(
      paragraphData,
      textToHighlight
    );

    if (startIndex == -1 || endIndex == -1) {
      throw new Error(`Could not find text ${textToHighlight} in doc ${docId}`);
    }

    const highlightRequest: docs_v1.Schema$Request = 
      {
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
  async buildInsertRequest(docId: string, docContent: docs_v1.Schema$StructuralElement[], textToInsert: string): Promise<docs_v1.Schema$Request> {
    const insertRequest: docs_v1.Schema$Request = 
      {
        insertText: {
          text: textToInsert,
          location: {
            index: 0,
          },
        },
      };
    return insertRequest;
  }

  /**
   * Appends the text to the end of the doc
   */
  async buildAppendRequest(docId: string, docContent: docs_v1.Schema$StructuralElement[], textToAppend: string): Promise<docs_v1.Schema$Request> {
    const appendRequest: docs_v1.Schema$Request = 
      {
        insertText: {
          text: textToAppend,
          location: {
            index: docContent.length,
          },
        },
      };
    return appendRequest;
  }

  async buildRemoveRequest(docId: string, docContent: docs_v1.Schema$StructuralElement[], textToRemove: string): Promise<docs_v1.Schema$Request> {
    const paragraphData = inspectDocContent(docContent).paragraphData;
    const { startIndex, endIndex } = findSubstringInParagraphs(
      paragraphData,
      textToRemove
    );
    if (startIndex == -1 || endIndex == -1) {
      throw new Error(`Could not find text ${textToRemove} in doc ${docId}`);
    }
    const removeRequest: docs_v1.Schema$Request = 
      {
        deleteContentRange: {
          range: {
            startIndex: startIndex,
            endIndex: endIndex,
          },
        },
      };
    return removeRequest;
  }

  async buildReplaceRequest(docId: string, docContent: docs_v1.Schema$StructuralElement[], textToReplace: string, textToReplaceWith: string): Promise<docs_v1.Schema$Request> {
    const paragraphData = inspectDocContent(docContent).paragraphData;
    const { startIndex, endIndex } = findSubstringInParagraphs(
      paragraphData,
      textToReplace
    );
    if (startIndex == -1 || endIndex == -1) {
      throw new Error(`Could not find text ${textToReplace} in doc ${docId}`);
    }
    const replaceRequest: docs_v1.Schema$Request = 
      {
        deleteContentRange: {
          range: {
            startIndex: startIndex,
            endIndex: endIndex,
          },
        },
        insertText: {
          text: textToReplaceWith,
          location: {
            index: startIndex,
          },
        },
      };
    return replaceRequest;
  }

  async buildReplaceAllRequest(docId: string, docContent: docs_v1.Schema$StructuralElement[], textToReplaceWith: string): Promise<docs_v1.Schema$Request> {
    const replaceAllRequest: docs_v1.Schema$Request = 
      {
        deleteContentRange: {
          range: {
            startIndex: 0,
            endIndex: docContent.length,
          },
        },
        insertText: {
          text: textToReplaceWith,
          location: {
            index: 0,
          },
        },
      };
    return replaceAllRequest;
  }

  async handleDocEdits(docId: string, edits: DocEdit[]): Promise<void> {
    const requests: docs_v1.Schema$Request[] = [];
    const { docs } = await this.getGoogleAPIs();
    const doc = await docs.documents.get({ documentId: docId });
    const docContent = doc.data.body?.content || [];
    if(!docContent.length) {
      console.warn(`Doc ${docId} has no content`);
      return;
    }
    for (const edit of edits) {
      switch (edit.action) {
        case DocEditAction.HIGHLIGHT:
          const highlightRequest = await this.buildHighlightRequest(docId, docContent, edit.text);
          requests.push(highlightRequest);
          break;
        case DocEditAction.INSERT:
          const insertRequest = await this.buildInsertRequest(docId, docContent, edit.text);
          requests.push(insertRequest);
          break;
        case DocEditAction.APPEND:
          const appendRequest = await this.buildAppendRequest(docId, docContent, edit.text);
          requests.push(appendRequest);
          break;
        case DocEditAction.REMOVE:
          const removeRequest = await this.buildRemoveRequest(docId, docContent, edit.text);
          requests.push(removeRequest);
          break;
        case DocEditAction.REPLACE:
          if(!edit.textToReplace) {
            throw new Error(`Text to replace is required for replace action`);
          }
          const replaceRequest = await this.buildReplaceRequest(docId, docContent, edit.text, edit.textToReplace);
          requests.push(replaceRequest);
          break;
        case DocEditAction.REPLACE_ALL:
          const replaceAllRequest = await this.buildReplaceAllRequest(docId, docContent, edit.text);
          requests.push(replaceAllRequest);
          break;
        default:
          throw new Error(`Unknown edit action: ${edit.action}`);
      }
    }
    // TODO: see if we get weird behavior due to batching (that can mess with indexing)
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: {
        requests: requests,
      },
    });
  }
}
