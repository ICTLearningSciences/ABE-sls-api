/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { DocumentDBManager } from './document_db_manager.js';
import { CloudServices } from './types.js';
import { DynamoDBManager } from '../aws/dynamo_db_manager.js';
import { CosmosDBManager } from '../azure/cosmos_db_manager.js';
import { getCloudService } from '../../helpers.js';

export function getDocumentDBManager(): DocumentDBManager {
  const cloudService = getCloudService();
  switch (cloudService) {
    case CloudServices.AWS:
      return new DynamoDBManager();
    case CloudServices.AZURE:
      return new CosmosDBManager();
    default:
      throw new Error('Cloud service not supported');
  }
}
