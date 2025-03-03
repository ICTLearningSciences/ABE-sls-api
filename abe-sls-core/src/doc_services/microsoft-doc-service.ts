/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { DocData } from '../types.js';
import { DocService } from './abstract-doc-service.js';
import { getDocData as _getDocData } from '../api.js';
import { AuthHeaders } from '../shared_functions/ai_steps_request/helpers.js';
import { fetchMostRecentVersion } from '../hooks/graphql_api.js';
import { IGDocVersion } from '../timeline-generation/types.js';

type MicrosoftDocVersion = {
  id: string;
  modifiedTime: string;
  rawText: string; // Might not be available
};

export class MicrosoftDocService extends DocService<MicrosoftDocVersion> {
  authHeaders: AuthHeaders;
  private static instance: MicrosoftDocService;

  constructor(authHeaders: AuthHeaders) {
    super();
    this.authHeaders = authHeaders;
  }

  async getDocData(docId: string): Promise<DocData> {
    const version = await fetchMostRecentVersion(docId);
    return Promise.resolve({
      plainText: version?.plainText || '',
      lastChangedId: version?.lastChangedId || '',
      title: version?.title || '',
      lastModifyingUser: version?.lastModifyingUser || '',
      modifiedTime: version?.modifiedTime || new Date().toISOString(),
    });
  }

  static getInstance(
    authHeaders: AuthHeaders
  ): DocService<MicrosoftDocVersion> {
    if (!MicrosoftDocService.instance) {
      MicrosoftDocService.instance = new MicrosoftDocService(authHeaders);
    }
    return MicrosoftDocService.instance;
  }

  fetchExternalDocVersion(docId: string): Promise<MicrosoftDocVersion[]> {
    // TODO: implement
    return Promise.resolve([]);
  }

  convertExternalDocVersionsToIGDocVersion(
    externalDocVersion: MicrosoftDocVersion[],
    lastRealVersion: IGDocVersion
  ): Promise<IGDocVersion[]> {
    // TODO: implement
    return Promise.resolve([]);
  }
}
