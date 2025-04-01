import { SSMSecretRuntimeFetch } from '../../../cloud_services/aws/secrets_manager_fetch.js';
import { SecretRuntimeFetch } from './secret_runtime_fetch.js';
import { CloudServices } from '../types.js';
import { getCloudService } from '../../../helpers.js';
import { AzureKeyVaultRuntimeFetch } from '../../../cloud_services/azure/key_vault_runtime_fetch.js';
import { DefaultSecretRuntimeFetch } from '../../../cloud_services/default/default-secret-runtime-fetch.js';
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
      case CloudServices.AZURE:
        return new AzureKeyVaultRuntimeFetch();
      default:
        return new DefaultSecretRuntimeFetch();
    }
  }
}
