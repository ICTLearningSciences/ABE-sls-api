import { CloudServices } from '../types.js';

/**
 * Handles fetching secrets during runtime.
 */
export abstract class SecretRuntimeFetch {
  private static instance: any = null;
  abstract cloudService: CloudServices;

  abstract fetchSecret(secretName: string): Promise<string>;
}
