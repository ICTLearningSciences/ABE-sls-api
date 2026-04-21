import { RagQuery } from './rag_query.js';
import { CloudServices } from '../types.js';
import { getCloudService } from '../../../helpers.js';
import { AzureRagQuery } from '../../azure/azure_rag_query.js';
import { AwsRagQuery } from '../../aws/aws_rag_query.js';

export class RagFetchFactory {
  private static ragQuery: RagQuery;

  static getRagFetchInstance() {
    if (!this.ragQuery) {
      this.ragQuery = this.getRagFetch(getCloudService());
    }
    return this.ragQuery;
  }

  static getRagFetch(cloudService: CloudServices) {
    switch (cloudService) {
      case CloudServices.AWS:
        return new AwsRagQuery();
      case CloudServices.AZURE:
        return new AzureRagQuery();
      default:
        throw new Error('Cloud service not supported for RAG fetch');
    }
  }
}
