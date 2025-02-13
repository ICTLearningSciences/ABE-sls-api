import { CloudServices } from '../types.js';
import { DynamoDBManager } from '../../aws/dynamo_db_manager.js';
import { CosmosDBManager } from '../../azure/cosmos_db_manager.js';
import { getCloudService } from '../../../helpers.js';
import { DocumentDBManager } from './document_db.js';

export class DocumentDBFactory {
  private static documentDBManager: DocumentDBManager;

  static getDocumentDBManagerInstance() {
    if (!this.documentDBManager) {
      this.documentDBManager = this.getDocumentDBManager(getCloudService());
    }
    return this.documentDBManager;
  }

  static getDocumentDBManager(cloudService: CloudServices) {
    switch (cloudService) {
      case CloudServices.AWS:
        return new DynamoDBManager();
      case CloudServices.AZURE:
        return new CosmosDBManager();
      default:
        throw new Error('Cloud service not supported');
    }
  }
}
