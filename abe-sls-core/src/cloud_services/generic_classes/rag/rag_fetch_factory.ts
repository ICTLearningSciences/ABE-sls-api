import { RagFetch } from './rag_fetch.js';
import { CloudServices } from '../types.js';
import { getCloudService } from '../../../helpers.js';
import { AzureRagFetch } from '../../azure/azure_rag_fetch.js';
import { AwsRagFetch } from '../../aws/aws_rag_fetch.js';

export class RagFetchFactory {
  private static ragFetch: RagFetch;

  static getRagFetchInstance() {
    if (!this.ragFetch) {
      this.ragFetch = this.getRagFetch(getCloudService());
    }
    return this.ragFetch;
  }

  static getRagFetch(cloudService: CloudServices) {
    switch (cloudService) {
      case CloudServices.AWS:
        return new AwsRagFetch();
      case CloudServices.AZURE:
        return new AzureRagFetch();
      default:
        throw new Error('Cloud service not supported for RAG fetch');
    }
  }
}
