/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { drive_v3 } from 'googleapis';
import { DocData } from '../types.js';
import { DocService } from './abstract-doc-service.js';
import { getDocData as _getDocData } from '../api.js';
import { AuthHeaders } from '../shared_functions/ai_steps_request/helpers.js';
import {
  UseWithGoogleApi,
  useWithGoogleApi as _useWithGoogleApi,
} from '../hooks/google_api.js';
import { IGDocVersion } from '../timeline-generation/types.js';
import { exponentialBackoff } from '../helpers.js';
import { AxiosRequestConfig } from 'axios';

type GoogleDocVersion = drive_v3.Schema$Revision;

export class GoogleDocService extends DocService<GoogleDocVersion> {
  authHeaders: AuthHeaders;
  private static instance: GoogleDocService;
  useWithGoogleApi: UseWithGoogleApi;

  constructor(authHeaders: AuthHeaders) {
    super();
    this.authHeaders = authHeaders;
    this.useWithGoogleApi = _useWithGoogleApi();
  }

  async getDocData(docsId: string): Promise<DocData> {
    const { getGoogleAPIs, getDocCurrentData } = this.useWithGoogleApi;
    const { drive, docs } = await getGoogleAPIs();
    const docData = await getDocCurrentData(docs, drive, docsId);
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
}
