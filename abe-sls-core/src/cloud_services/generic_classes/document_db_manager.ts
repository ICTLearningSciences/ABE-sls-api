/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { DynamoDBManager } from '../aws/dynamo_db_manager.js';
import { AiAsyncJobStatus } from '../../types.js';
import { CloudServices } from './types.js';
import { CosmosDBManager } from '../azure/cosmos_db_manager.js';

export interface JobStatusRes {
  aiServiceResponse: string;
  jobStatus: AiAsyncJobStatus;
  answer: string;
  apiError: string;
}

export abstract class DocumentDBManager {
  abstract updateExistingItem(
    jobId: string,
    fields: Record<string, any>
  ): Promise<void>;
  abstract storeNewItem(
    jobId: string,
    fields: Record<string, any>
  ): Promise<void>;
  abstract getItem(jobId: string): Promise<any>;
}

function getCloudService(): CloudServices {
  const val = process.env['CLOUD_SERVICE'];
  if (val) {
    if (Object.values(CloudServices).includes(val as CloudServices)) {
      return val as CloudServices;
    } else {
      throw new Error(`Invalid CLOUD_SERVICE: ${val}`);
    }
  }
  throw new Error('CLOUD_SERVICE is not defined');
}

export function getDocumentDBManager(): DocumentDBManager {
  const cloudService = getCloudService();
  switch (cloudService) {
    case CloudServices.AWS:
      return new DynamoDBManager();
    case CloudServices.AZURE:
      return new CosmosDBManager();
  }
}
