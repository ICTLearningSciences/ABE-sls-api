import { CloudServices } from '../types.js';

/**
 * Handles fetching secrets during runtime.
 */
export abstract class SecretRuntimeFetch {
  abstract cloudService: CloudServices;

  abstract fetchSecret(secretName: string): Promise<string>;
}
