import { CloudServices } from '../types.js';

export interface RagSearchResult {
  title: string;
  chunk: string;
  score: number;
}

/**
 * Handles querying RAG stores.
 */
export abstract class RagQuery {
  private static instance: any = null;
  abstract cloudService: CloudServices;

  abstract queryRagStore(
    queryString: string,
    topN: number,
    metadataFilters: Record<string, string | string[]>
  ): Promise<RagSearchResult[]>;

  abstract fetchRagDocument(webLocation: string): Promise<string | Uint8Array>;
}
