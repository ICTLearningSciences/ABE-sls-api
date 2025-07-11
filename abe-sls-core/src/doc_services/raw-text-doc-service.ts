/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { DocData } from '../types.js';
import {
  DocService,
  LabeledDocData,
  LabeledDocDataRecord,
} from './abstract-doc-service.js';
import { DocEditAction } from './helpers/edit-doc-helpers.js';
import { AuthHeaders } from '../shared_functions/ai_steps_request/helpers.js';
import { IGDocVersion } from '../timeline-generation/types.js';
import { fetchMostRecentVersion } from '../hooks/graphql_api.js';

type RawTextDocVersion = string;

/**
 * "Service" for raw text documents that we fully manage ourselves.
 */
export class RawTextDocService extends DocService<RawTextDocVersion> {
  authHeaders: AuthHeaders;
  private static instance: RawTextDocService;
  labeledDocData: LabeledDocDataRecord = {};

  constructor(authHeaders: AuthHeaders) {
    super();
    this.authHeaders = authHeaders;
  }

  async getDocData(docId: string): Promise<DocData> {
    const version = await fetchMostRecentVersion(docId);
    return Promise.resolve({
      plainText: version?.plainText || '',
      markdownText: version?.markdownText || '',
      lastChangedId: version?.lastChangedId || '',
      title: version?.title || '',
      lastModifyingUser: version?.lastModifyingUser || '',
      modifiedTime: version?.modifiedTime || new Date().toISOString(),
    });
  }

  static getInstance(authHeaders: AuthHeaders): DocService<RawTextDocVersion> {
    if (!RawTextDocService.instance) {
      RawTextDocService.instance = new RawTextDocService(authHeaders);
    }
    return RawTextDocService.instance;
  }

  fetchExternalDocVersion(docId: string): Promise<RawTextDocVersion[]> {
    // No-op: There are no external versions for raw text docs, do nothing.
    return Promise.resolve([]);
  }

  convertExternalDocVersionsToIGDocVersion(
    externalDocVersion: RawTextDocVersion[],
    lastRealVersion: IGDocVersion
  ): Promise<IGDocVersion[]> {
    // No-op: There are no external versions for raw text docs, do nothing.
    return Promise.resolve([]);
  }

  async handleDocEdits(docId: string, edits: DocEditAction[]): Promise<void> {
    throw new Error('Not implemented');
  }

  async getLabeledDocData(docId: string): Promise<LabeledDocData> {
    throw new Error('Not implemented');
  }
}
