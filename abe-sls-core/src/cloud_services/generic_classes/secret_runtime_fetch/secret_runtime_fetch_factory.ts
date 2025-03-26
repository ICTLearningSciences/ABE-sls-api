import { SSMSecretRuntimeFetch } from '../../../cloud_services/aws/secrets_manager_fetch.js';
import { SecretRuntimeFetch } from './secret_runtime_fetch.js';
import { CloudServices } from '../types';
import { getCloudService } from '../../../helpers.js';

export class SecretRuntimeFetchFactory {
  private static secretRuntimeFetch: SecretRuntimeFetch;

  static getSecretRuntimeFetchInstance() {
    if (!this.secretRuntimeFetch) {
      this.secretRuntimeFetch = this.getSecretRuntimeFetch(getCloudService());
    }
    return this.secretRuntimeFetch;
  }

  static getSecretRuntimeFetch(cloudService: CloudServices) {
    switch (cloudService) {
      case CloudServices.AWS:
        return new SSMSecretRuntimeFetch();
      // TODO: Add Azure secret runtime fetch
      //   case CloudServices.AZURE:
      //     return new AzureSecretRuntimeFetch();
      default:
        throw new Error('Cloud service not supported');
    }
  }
}
