/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { DocData, DocServices } from '../types.js';
import { DocService } from './abstract-doc-service.js';
import { getDocData as _getDocData } from '../api.js';
import { AuthHeaders } from '../functions/openai/helpers.js';
import {
  UseWithGoogleApi,
  useWithGoogleApi as _useWithGoogleApi,
} from '../hooks/google_api.js';

export class GoogleDocService extends DocService {
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

  static getInstance(authHeaders: AuthHeaders): DocService {
    if (!GoogleDocService.instance) {
      GoogleDocService.instance = new GoogleDocService(authHeaders);
    }
    return GoogleDocService.instance;
  }
}
