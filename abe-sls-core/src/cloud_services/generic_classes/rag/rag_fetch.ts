import { CloudServices } from '../types.js';

export interface RagSearchResult {
  title: string;
  chunk: string;
  score: number;
}

/**
 * Handles querying RAG stores.
 */
export abstract class RagFetch {
  private static instance: any = null;
  abstract cloudService: CloudServices;

  abstract queryRagStore(
    queryString: string,
    topN: number
  ): Promise<RagSearchResult[]>;
}
