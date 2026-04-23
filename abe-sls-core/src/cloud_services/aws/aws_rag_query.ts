/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
  RetrieveCommandInput,
} from '@aws-sdk/client-bedrock-agent-runtime';
import { RagQuery, RagSearchResult } from '../generic_classes/rag/rag_query.js';
import { CloudServices } from '../generic_classes/types.js';
import requireEnv from '../../helpers.js';
import { buildFilter } from './helpers.js';

/**
 * AWS RAG implementation using Amazon Bedrock Knowledge Bases.
 */
export class AwsRagQuery extends RagQuery {
  cloudService: CloudServices = CloudServices.AWS;

  private knowledgeBaseId = requireEnv('AWS_KNOWLEDGE_BASE_ID');
  private region = 'us-east-1';

  private bedrockClient: BedrockAgentRuntimeClient;

  constructor() {
    super();
    this.bedrockClient = new BedrockAgentRuntimeClient({
      region: this.region,
    });
  }

  async queryRagStore(
    queryString: string,
    topN: number,
    metadataFilters: Record<string, string | string[]>
  ): Promise<RagSearchResult[]> {
    const filter = buildFilter(metadataFilters);

    const input: RetrieveCommandInput = {
      knowledgeBaseId: this.knowledgeBaseId,
      retrievalQuery: {
        text: queryString,
      },
      retrievalConfiguration: {
        vectorSearchConfiguration: {
          numberOfResults: topN,
          ...(filter && { filter }),
        },
      },
    };

    const command = new RetrieveCommand(input);
    const response = await this.bedrockClient.send(command);

    const ragResults: RagSearchResult[] = [];

    if (response.retrievalResults) {
      for (const result of response.retrievalResults) {
        const titleMetadata = result.metadata?.['title'];
        const title =
          typeof titleMetadata === 'string'
            ? titleMetadata
            : result.location?.s3Location?.uri || 'Untitled';

        const chunk = result.content?.text || '';

        const score = result.score || 0;

        ragResults.push({
          title,
          chunk,
          score,
        });
      }
    }

    return ragResults;
  }
}
