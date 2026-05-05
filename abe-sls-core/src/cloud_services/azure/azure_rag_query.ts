/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { AzureOpenAI } from 'openai';
import {
  SearchClient,
  SearchDocumentsResult,
  SearchOptions,
  VectorQuery,
  AzureKeyCredential,
} from '@azure/search-documents';
import {
  RagDocumentResult,
  RagQuery,
  RagSearchResult,
} from '../generic_classes/rag/rag_query.js';
import { CloudServices } from '../generic_classes/types.js';
import requireEnv from '../../helpers.js';
import { buildFilter } from './helpers.js';

export class AzureRagQuery extends RagQuery {
  cloudService: CloudServices = CloudServices.AZURE;

  private azureOpenAiEndpoint = requireEnv('AZURE_OPENAI_ENDPOINT');
  private azureOpenAiApiKey = requireEnv('AZURE_OPENAI_API_KEY');

  private vectorSearchEndpoint = requireEnv('VECTOR_SEARCH_ENDPOINT');
  private vectorSearchIndexName = requireEnv('VECTOR_SEARCH_INDEX_NAME');
  private vectorSearchApiKey = requireEnv('VECTOR_SEARCH_API_KEY');
  private embeddingModel = requireEnv('EMBEDDING_MODEL');
  private semanticConfigurationName = requireEnv('SEMANTIC_CONFIGURATION_NAME');

  private openai: AzureOpenAI;
  private searchClient: SearchClient<any>;

  constructor() {
    super();
    this.openai = new AzureOpenAI({
      apiVersion: '2025-03-01-preview',
      apiKey: this.azureOpenAiApiKey,
      endpoint: this.azureOpenAiEndpoint,
    });

    this.searchClient = new SearchClient(
      this.vectorSearchEndpoint,
      this.vectorSearchIndexName,
      new AzureKeyCredential(this.vectorSearchApiKey)
    );
  }

  async queryRagStore(
    queryString: string,
    topN: number,
    metadataFilters: Record<string, string | string[]>
  ): Promise<RagSearchResult[]> {
    // Generate embedding for the query
    const embedding = await this.openai.embeddings.create({
      model: this.embeddingModel,
      input: queryString,
    });

    const filter = buildFilter(metadataFilters);

    // Create vector query
    const vectorQuery: VectorQuery<any> = {
      vector: embedding.data[0].embedding,
      kNearestNeighborsCount: topN,
      fields: ['text_vector'],
      kind: 'vector',
      exhaustive: true,
    };

    // Create search options
    const searchOptions: SearchOptions<any> = {
      top: topN,
      select: ['title', 'chunk'] as const,
      includeTotalCount: true,
      ...(filter && { filter }),
      queryType: 'semantic' as const,
      semanticSearchOptions: {
        configurationName: this.semanticConfigurationName,
      },
      vectorSearchOptions: {
        queries: [vectorQuery],
        filterMode: 'postFilter',
      },
    };

    // Execute search
    const results: SearchDocumentsResult<any> = await this.searchClient.search(
      queryString,
      searchOptions
    );

    // Extract and format results
    const ragResults: RagSearchResult[] = [];
    for await (const result of results.results) {
      ragResults.push({
        title: result.document.title,
        chunk: result.document.chunk,
        score: result.score || 0,
      });
    }

    return ragResults;
  }

  async fetchRagDocument(docName: string): Promise<string> {
    return '';
  }

  async listRagDocuments(): Promise<Object[]> {
    return [];
  }
}
