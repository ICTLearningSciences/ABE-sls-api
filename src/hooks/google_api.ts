/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { google, drive_v3, docs_v1 } from 'googleapis';
import axios, { AxiosRequestConfig } from 'axios';
import { exponentialBackoff } from '../helpers.js';
import { DocData } from '../types.js';

export interface GoogleDocVersion {
  id: string;
  modifiedTime: string;
  rawText: string;
}

export async function convertGoogleDocRevisions(
  driveRevisions: drive_v3.Schema$Revision[],
  driveAccessToken: string
): Promise<GoogleDocVersion[]> {
  const requests: Promise<GoogleDocVersion | undefined>[] = driveRevisions.map(
    async (revision) => {
      if (!revision['exportLinks']) {
        throw new Error('Google Doc revision exportLinks is empty');
      }
      const textUrl = revision['exportLinks']['text/plain'];
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
        id: revision['id'] || '',
        modifiedTime: revision['modifiedTime'] || '',
        rawText: res.data,
        exportLinks: revision['exportLinks'] || {},
        lastModifyingUser: revision['lastModifyingUser'] || {},
        originalFilename: revision['originalFilename'] || '',
        keepForever: revision['keepForever'] || false,
      };
    }
  );
  const allRevisions = await Promise.all(requests);
  return allRevisions.filter((revision) => {
    return revision !== undefined;
  }) as GoogleDocVersion[];
}

interface InspectParagraph {
  allText: string;
  startIndex: number;
  endIndex: number;
}

interface InspectDocContent {
  paragraphData: InspectParagraph[];
  plainText: string;
}

function inspectDocContent(
  docContent: docs_v1.Schema$StructuralElement[]
): InspectDocContent {
  const allParagraphs: docs_v1.Schema$StructuralElement[] = docContent.filter(
    (element) => {
      return element.paragraph !== undefined;
    }
  );

  const paragraphData: InspectParagraph[] = allParagraphs.map((paragraph) => {
    const allText = paragraph
      .paragraph!.elements?.map((e) => {
        return e.textRun?.content || '';
      })
      .join('');
    return {
      allText: allText || '',
      startIndex: paragraph.startIndex || 0,
      endIndex: paragraph.endIndex || 0,
    };
  });

  const plainText = paragraphData
    .map((p) => {
      return p.allText;
    })
    .join('');

  return {
    paragraphData,
    plainText,
  };
}

interface SubstringPosition {
  startIndex: number;
  endIndex: number;
}

function findSubstringInParagraphs(
  paragraphData: InspectParagraph[],
  substring: string
): SubstringPosition {
  const relevantParagraph = paragraphData.find((paragraph) => {
    return paragraph.allText.includes(substring);
  });
  if (!relevantParagraph) {
    return {
      startIndex: -1,
      endIndex: -1,
    };
  }
  const substringStart = relevantParagraph.allText.indexOf(substring);
  const startIndex = relevantParagraph.startIndex + substringStart;
  const endIndex = startIndex + substring.length;
  return {
    startIndex,
    endIndex,
  };
}

export interface UseWithGoogleApi {
  getGoogleAPIs: () => Promise<{
    drive: drive_v3.Drive;
    docs: docs_v1.Docs;
    accessToken: string | null | undefined;
  }>;
  createGoogleDoc: (
    driveAPI: drive_v3.Drive,
    emailsToGiveAccess: string[],
    copyFromDocId: string,
    newDocTitle: string
  ) => Promise<{
    docId: string;
    webViewLink: string;
    createdTime: string;
  }>;
  getGoogleDocVersions: (
    driveAPI: drive_v3.Drive,
    docsId: string,
    driveAccessToken: string
  ) => Promise<drive_v3.Schema$Revision[]>;
  highlightGoogleDocText: (
    docsAPI: docs_v1.Docs,
    docId: string,
    textToHighlight: string
  ) => Promise<void>;
  removeGoogleDocText: (
    docsAPI: docs_v1.Docs,
    docId: string,
    textToRemove: string
  ) => Promise<void>;
  insertGoogleDocText: (
    docsAPI: docs_v1.Docs,
    docId: string,
    textToInsert: string,
    insertAfterText: string
  ) => Promise<void>;
  getDocCurrentData: (
    docsAPI: docs_v1.Docs,
    driveAPI: drive_v3.Drive,
    docId: string
  ) => Promise<DocData>;
}

export function useWithGoogleApi(): UseWithGoogleApi {
  async function getGoogleAPIs() {
    // create json file with google service credentials
    const googleServiceCredentials = JSON.parse(
      process.env.GOOGLE_SERVICE_CREDS || ''
    );

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: googleServiceCredentials['client_email'],
        client_id: googleServiceCredentials['client_id'],
        private_key: googleServiceCredentials['private_key'],
      },
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file',
      ],
    });
    google.options({ auth });
    const drive = google.drive({ version: 'v3' });
    const docs = google.docs({ version: 'v1' });
    const accessToken = await auth.getAccessToken();
    return { drive, docs, accessToken };
  }

  async function createGoogleDoc(
    driveAPI: drive_v3.Drive,
    emailsToGiveAccess: string[] = [],
    copyFromDocId: string = '',
    newDocTitle: string = ''
  ) {
    const parentFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '';

    const createFileMetadata: drive_v3.Schema$File = {
      name: newDocTitle || 'My Document',
      mimeType: 'application/vnd.google-apps.document',
      writersCanShare: true,
      parents: [parentFolderId],
    };

    const copyFileMetadata: drive_v3.Schema$File = {
      ...(newDocTitle ? { name: newDocTitle } : {}),
      mimeType: 'application/vnd.google-apps.document',
      writersCanShare: true,
      parents: [parentFolderId],
    };

    const createdFile = copyFromDocId
      ? await driveAPI.files.copy({
          fileId: copyFromDocId,
          requestBody: copyFileMetadata,
          fields: 'id,webViewLink',
          supportsAllDrives: true,
        })
      : await driveAPI.files.create({
          requestBody: createFileMetadata,
          fields: 'id,webViewLink',
          supportsAllDrives: true,
        });

    const docId = createdFile.data.id || '';
    const createdTime = createdFile.data.createdTime || '';
    const webViewLink = createdFile.data.webViewLink;
    if (!docId) {
      throw new Error('Google Doc ID is empty');
    }
    if (!webViewLink) {
      throw new Error('Google Doc link is empty');
    }
    const permissionPromises = emailsToGiveAccess.map(async (email) => {
      try {
        const res = await driveAPI.permissions.create({
          fileId: docId,
          requestBody: {
            role: 'writer',
            type: 'user',
            emailAddress: email,
          },
        });
      } catch (e) {
        console.log(`Failed to add ${email} to ${docId}`);
        console.log(e);
      }
    });
    function anyonePromise() {
      return new Promise<void>((resolve, reject) => {
        driveAPI.permissions.create(
          {
            fileId: docId,
            requestBody: {
              role: 'reader',
              type: 'anyone',
            },
          },
          (err, res) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          }
        );
      });
    }
    permissionPromises.push(anyonePromise());
    await Promise.all(permissionPromises);
    return { docId, webViewLink, createdTime };
  }

  async function getFileLastModifier(driveAPI: drive_v3.Drive, fileId: string) {
    const driveFileLastModifier = await driveAPI.files.get({
      fileId: fileId,
      fields: 'lastModifyingUser',
    });
    return driveFileLastModifier.data.lastModifyingUser;
  }

  async function getGoogleDocVersions(
    driveAPI: drive_v3.Drive,
    docsId: string,
    driveAccessToken: string
  ): Promise<drive_v3.Schema$Revision[]> {
    const revisions = await driveAPI.revisions.list({
      fileId: docsId,
      fields:
        'revisions(id,modifiedTime,lastModifyingUser,originalFilename,keepForever, exportLinks)',
    });
    return revisions.data.revisions || [];
  }

  async function highlightGoogleDocText(
    docsAPI: docs_v1.Docs,
    docId: string,
    textToHighlight: string
  ) {
    const doc = await docsAPI.documents.get({ documentId: docId });
    const docContent = doc.data.body?.content || [];
    const paragraphData = inspectDocContent(docContent).paragraphData;
    const { startIndex, endIndex } = findSubstringInParagraphs(
      paragraphData,
      textToHighlight
    );

    if (startIndex == -1 || endIndex == -1) {
      throw new Error(`Could not find text ${textToHighlight} in doc ${docId}`);
    }

    const requests: docs_v1.Schema$Request[] = [
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
          fields: 'backgroundColor', // Specify which fields to update
        },
      },
    ];
    await docsAPI.documents.batchUpdate({
      documentId: docId,
      requestBody: {
        requests: requests,
      },
    });
  }

  async function removeGoogleDocText(
    docsAPI: docs_v1.Docs,
    docId: string,
    textToRemove: string
  ) {
    const doc = await docsAPI.documents.get({ documentId: docId });
    const docContent = doc.data.body?.content || [];
    const paragraphData = inspectDocContent(docContent).paragraphData;
    const { startIndex, endIndex } = findSubstringInParagraphs(
      paragraphData,
      textToRemove
    );

    if (startIndex == -1 || endIndex == -1) {
      throw new Error(`Could not find text ${textToRemove} in doc ${docId}`);
    }

    const requests: docs_v1.Schema$Request[] = [
      {
        deleteContentRange: {
          range: {
            startIndex: startIndex,
            endIndex: endIndex,
          },
        },
      },
    ];
    await docsAPI.documents.batchUpdate({
      documentId: docId,
      requestBody: {
        requests: requests,
      },
    });
  }

  async function insertGoogleDocText(
    docsAPI: docs_v1.Docs,
    docId: string,
    textToInsert: string,
    insertAfterText: string
  ) {
    const doc = await docsAPI.documents.get({ documentId: docId });
    const docContent = doc.data.body?.content || [];
    const paragraphData = inspectDocContent(docContent).paragraphData;
    const { startIndex, endIndex } = findSubstringInParagraphs(
      paragraphData,
      insertAfterText
    );

    if (startIndex == -1 || endIndex == -1) {
      throw new Error(`Could not find text ${insertAfterText} in doc ${docId}`);
    }

    const requests: docs_v1.Schema$Request[] = [
      {
        insertText: {
          location: {
            index: endIndex,
          },
          text: textToInsert,
        },
      },
    ];
    await docsAPI.documents.batchUpdate({
      documentId: docId,
      requestBody: {
        requests: requests,
      },
    });
  }

  async function getDocCurrentData(
    docsAPI: docs_v1.Docs,
    driveAPI: drive_v3.Drive,
    docId: string
  ): Promise<DocData> {
    const doc = await docsAPI.documents.get({ documentId: docId });
    const docContent = doc.data.body?.content || [];
    const lastChangedId = doc.data.revisionId || '';
    const title = doc.data.title || '';
    const plainText = inspectDocContent(docContent).plainText;
    const revisions = await driveAPI.revisions.list({
      fileId: docId,
      fields: 'revisions(id,modifiedTime,lastModifyingUser)',
    });

    const lastRevision = revisions.data.revisions?.length
      ? revisions.data.revisions[revisions.data.revisions.length - 1]
      : '';
    const lastModifyingUser = lastRevision
      ? lastRevision.lastModifyingUser?.emailAddress || ''
      : '';
    const modifiedTime = lastRevision ? lastRevision.modifiedTime : '';

    return {
      plainText,
      lastChangedId,
      title,
      lastModifyingUser,
      modifiedTime: modifiedTime || '',
    };
  }

  return {
    getGoogleAPIs,
    createGoogleDoc,
    getGoogleDocVersions,
    highlightGoogleDocText,
    removeGoogleDocText,
    insertGoogleDocText,
    getDocCurrentData,
  };
}
