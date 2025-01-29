/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { DocServices } from '../types.js';
import { GoogleDocService } from './google-doc-services.js';
import { AuthHeaders } from '../functions/openai/helpers.js';
import { MicrosoftDocService } from './microsoft-doc-service.js';

export class DocServiceFactory {
  static getDocService(targetDocService: DocServices, authHeader: AuthHeaders) {
    switch (targetDocService) {
      case DocServices.GOOGLE_DOCS:
        return GoogleDocService.getInstance(authHeader);
      case DocServices.MICROSOFT_WORD:
        return MicrosoftDocService.getInstance(authHeader);
      default:
        throw new Error(`DocService ${targetDocService} not found`);
    }
  }
}
