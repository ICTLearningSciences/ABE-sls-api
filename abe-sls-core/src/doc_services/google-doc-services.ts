/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { docs_v1, drive_v3 } from 'googleapis';
import { DocData } from '../types.js';
import {
  DocService,
  DocTextMapping,
  LabeledDocData,
  LabeledDocDataRecord,
} from './abstract-doc-service.js';
import { getDocData as _getDocData } from '../api.js';
import { AuthHeaders } from '../shared_functions/ai_steps_request/helpers.js';
import {
  GoogleAPIs,
  UseWithGoogleApi,
  useWithGoogleApi as _useWithGoogleApi,
  findSubstringInParagraphMapping,
  inspectDocContent,
} from '../hooks/google_api.js';
import { IGDocVersion } from '../timeline-generation/types.js';
import { exponentialBackoff } from '../helpers.js';
import { AxiosRequestConfig } from 'axios';
import {
  DocEditAction,
  InsertParagraphAction,
  ModifyParagraphAction,
  HighlightPhraseInParagraphAction,
  DocEditActions,
} from './helpers/edit-doc-helpers.js';
import { v4 as uuidv4 } from 'uuid';

type GoogleDocVersion = drive_v3.Schema$Revision;

export class GoogleDocService extends DocService<GoogleDocVersion> {
  authHeaders: AuthHeaders;
  private static instance: GoogleDocService;
  useWithGoogleApi: UseWithGoogleApi;
  googleApi?: GoogleAPIs;
  labeledDocData: LabeledDocDataRecord = {};

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
    edit: HighlightPhraseInParagraphAction
  ): Promise<docs_v1.Schema$Request> {
    const paragraphId = edit.highlight_phrase_in_paragraph_data.paragraphId;
    const paragraph = this.labeledDocData[docId]?.docTextMappings.find((p) => {
      return p.paragraphId === paragraphId;
    }) as DocTextMapping;
    if (!paragraph) {
      throw new Error(
        `Could not find paragraph ${paragraphId} in mappings for doc ${docId}`
      );
    }
    const { startIndex, endIndex } = findSubstringInParagraphMapping(
      paragraph,
      edit.highlight_phrase_in_paragraph_data.phrase
    );

    if (startIndex == -1 || endIndex == -1) {
      throw new Error(
        `Could not find text ${edit.highlight_phrase_in_paragraph_data.phrase} in doc ${docId} at paragraph ${edit.highlight_phrase_in_paragraph_data.paragraphId}`
      );
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

  async buildInsertAfterParagraphRequest(
    docId: string,
    edit: InsertParagraphAction
  ): Promise<docs_v1.Schema$Request> {
    const paragraph = this.labeledDocData[docId]?.docTextMappings.find((p) => {
      return p.paragraphId === edit.insert_paragraph_data.location.afterParagraphId;
    }) as DocTextMapping;
    if (!paragraph) {
      throw new Error(
        `Could not find paragraph ${edit.insert_paragraph_data.location.afterParagraphId} in mappings for doc ${docId}`
      );
    }
    const { paragraphStartIndex, paragraphEndIndex } = paragraph;
    if (paragraphStartIndex == -1 || paragraphEndIndex == -1) {
      throw new Error(
        `Could not find paragraph ${edit.insert_paragraph_data.location.afterParagraphId} in doc ${docId}`
      );
    }
    const insertAfterRequest: docs_v1.Schema$Request = {
      insertText: {
        text: edit.insert_paragraph_data.newParagraphText,
        location: {
          index: paragraphEndIndex,
        },
      },
    };
    return insertAfterRequest;
  }

  async buildModifyParagraphRequest(
    docId: string,
    edit: ModifyParagraphAction
  ): Promise<docs_v1.Schema$Request[]> {
    const paragraph = this.labeledDocData[docId]?.docTextMappings.find((p) => {
      return p.paragraphId === edit.modify_paragraph_data.paragraphId;
    }) as DocTextMapping;
    if (!paragraph) {
      throw new Error(
        `Could not find paragraph ${edit.modify_paragraph_data.paragraphId} in mappings for doc ${docId}`
      );
    }
    const { paragraphStartIndex, paragraphEndIndex } = paragraph;
    if (paragraphStartIndex == -1 || paragraphEndIndex == -1) {
      throw new Error(
        `Could not find paragraph ${edit.modify_paragraph_data.paragraphId} in doc ${docId}`
      );
    }
    const modifyRequest: docs_v1.Schema$Request[] = [
      {
        deleteContentRange: {
          range: {
            startIndex: paragraphStartIndex,
            endIndex: paragraphEndIndex,
          },
        },
      },
      {
        insertText: {
          text: edit.modify_paragraph_data.newParagraphText,
          location: {
            index: paragraphStartIndex,
          },
        },
      },
    ];
    return modifyRequest;
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

  async handleDocEdits(docId: string, edits: DocEditAction[]): Promise<void> {
    const { docs } = await this.getGoogleAPIs();
    console.log('edits', JSON.stringify(edits, null, 2));
    console.log(JSON.stringify(edits, null, 2));
    for (const edit of edits) {
      // TODO: recalibrate the doc text mappings after each edit
      console.log(`executing edit: ${edit}`);
      switch (edit.action) {
        case DocEditActions.HIGHLIGHT_PHRASE_IN_PARAGRAPH:
          const highlightAction = edit as HighlightPhraseInParagraphAction;
          const highlightRequest = await this.buildHighlightRequest(
            docId,
            highlightAction
          );
          await this.executeBatchUpdate(docs, docId, [highlightRequest]);
          break;
        case DocEditActions.INSERT_PARAGRAPH:
          const action = edit as InsertParagraphAction;
          if (action.insert_paragraph_data.location.where === 'start_of_document') {
            // insert at the start of the document
            const insertAtStartRequest = await this.buildInsertAtStartRequest(
              action.insert_paragraph_data.newParagraphText
            );
            await this.executeBatchUpdate(docs, docId, [insertAtStartRequest]);
          } else if (action.insert_paragraph_data.location.where === 'end_of_document') {
            const insertAtEndRequest = await this.buildInsertAtEndRequest(
              action.insert_paragraph_data.newParagraphText
            );
            await this.executeBatchUpdate(docs, docId, [insertAtEndRequest]);
          } else if (action.insert_paragraph_data.location.where === 'after_paragraph') {
            const insertAfterRequest =
              await this.buildInsertAfterParagraphRequest(docId, action);
            await this.executeBatchUpdate(docs, docId, [insertAfterRequest]);
          } else {
            throw new Error(`Unknown location: ${action.insert_paragraph_data.location.where}`);
          }
          break;
        case DocEditActions.MODIFY_PARAGRAPH:
          const modifyAction = edit as ModifyParagraphAction;
          const modifyRequest = await this.buildModifyParagraphRequest(
            docId,
            modifyAction
          );
          await this.executeBatchUpdate(docs, docId, modifyRequest);
          break;
        default:
          throw new Error(`Unknown edit action: ${edit}`);
      }
    }
  }

  async getLabeledDocData(docId: string): Promise<LabeledDocData> {
    const { docs } = await this.getGoogleAPIs();
    const doc = await docs.documents.get({ documentId: docId });
    const docContent = doc.data.body?.content || [];

    const paragraphData = inspectDocContent(docContent).paragraphData;
    const docTextMappings: DocTextMapping[] = paragraphData.map(
      (paragraph, i) => {
        return {
          paragraphId: `PARAGRAPH_${uuidv4()}`,
          paragraphIndex: i,
          paragraphText: paragraph.allText,
          paragraphStartIndex: paragraph.startIndex,
          paragraphEndIndex: paragraph.endIndex,
        };
      }
    );
    const labeledDocFullText = docTextMappings
      .map((paragraph) => {
        return `${paragraph.paragraphId}\n${paragraph.paragraphText}`;
      })
      .join('\n');
    const labeledDocData: LabeledDocData = {
      docId: docId,
      docTextMappings: docTextMappings,
      labeledDocFullText: labeledDocFullText,
    };
    this.labeledDocData[docId] = labeledDocData;
    return labeledDocData;
  }
}
