/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { DocData } from '../types.js';
import { DocService } from './abstract-doc-service.js';
import { getDocData as _getDocData } from '../api.js';
import { AuthHeaders } from '../functions/openai/helpers.js';

export class MicrosoftDocService extends DocService {
  authHeaders: AuthHeaders;
  private static instance: MicrosoftDocService;

  constructor(authHeaders: AuthHeaders) {
    super();
    this.authHeaders = authHeaders;
  }

  async getDocData(docId: string): Promise<DocData> {
    return Promise.resolve({
      plainText:
        'Pinto beans are a versatile and nutritious legume commonly used in various cuisines, especially in Mexican and Southwestern dishes. They are known for their earthy flavor and creamy texture, making them perfect for soups, stews, refried beans, and burritos. Rich in protein, fiber, vitamins, and minerals, pinto beans are a great plant-based protein source for vegetarians and vegans. When cooked, they turn from speckled pink and brown to a solid light brown, and they readily absorb the flavors of spices and seasonings, making them a staple in flavorful, hearty meals.',
      lastChangedId: '1234',
      title: 'Test Doc',
      lastModifyingUser: 'testuser',
      modifiedTime: new Date().toISOString(),
    });
  }

  static getInstance(authHeaders: AuthHeaders): DocService {
    if (!MicrosoftDocService.instance) {
      MicrosoftDocService.instance = new MicrosoftDocService(authHeaders);
    }
    return MicrosoftDocService.instance;
  }
}
