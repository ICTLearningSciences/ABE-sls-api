import { CloudServices } from '../types.js';

export interface RagSearchResult {
  title: string;
  chunk: string;
  score: number;
}

export interface RagDocumentResult {
  data: string | Uint8Array;
  mimeType?: string;
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

  abstract fetchRagDocument(docName: string): Promise<string>;

  abstract listRagDocuments(): Promise<Object[]>;

  abstract getSignedUploadUrl(fileName: string): Promise<string>;
}
