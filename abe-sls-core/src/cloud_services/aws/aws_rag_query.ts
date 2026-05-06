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
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  RagDocumentResult,
  RagQuery,
  RagSearchResult,
} from '../generic_classes/rag/rag_query.js';
import { CloudServices } from '../generic_classes/types.js';
import requireEnv, { getSourceFileNameFromRagResult } from '../../helpers.js';
import { buildFilter } from './helpers.js';
import {
  S3Client,
  GetObjectCommand,
  GetObjectCommandInput,
  ListObjectsV2Command,
  PutObjectCommandInput,
  PutObjectCommand,
  _Object,
} from '@aws-sdk/client-s3';

/**
 * AWS RAG implementation using Amazon Bedrock Knowledge Bases.
 */
export class AwsRagQuery extends RagQuery {
  cloudService: CloudServices = CloudServices.AWS;

  private s3BucketName = requireEnv('RAG_S3_BUCKET');
  private knowledgeBaseId = requireEnv('AWS_KNOWLEDGE_BASE_ID');
  private region = 'us-east-1';

  private bedrockClient: BedrockAgentRuntimeClient;
  private s3Client: S3Client;

  constructor() {
    super();
    this.bedrockClient = new BedrockAgentRuntimeClient({
      region: this.region,
    });
    this.s3Client = new S3Client({
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
        const sourceFileName = getSourceFileNameFromRagResult(result);
        const title =
          typeof titleMetadata === 'string' ? titleMetadata : sourceFileName;

        const chunk = result.content?.text || '';
        const score = result.score || 0;

        ragResults.push({
          title,
          chunk,
          score,
          sourceFileName,
          sourceUrl: '',
        });
      }
    }

    // get the source url for each rag result in parallel, ignoring errors
    const sourceUrls = await Promise.all(
      ragResults.map((rag) =>
        this.fetchRagDocument(rag.sourceFileName).catch(() => '')
      )
    );
    sourceUrls.forEach((url, i) => {
      ragResults[i].sourceUrl = url;
    });

    return ragResults;
  }

  async fetchRagDocument(docName: string): Promise<string> {
    const bucket = this.s3BucketName;
    const key = docName;

    try {
      const getObjectCommandInput: GetObjectCommandInput = {
        Bucket: bucket,
        Key: key,
      };

      const getObjectCommmand = new GetObjectCommand(getObjectCommandInput);

      const url = await getSignedUrl(this.s3Client, getObjectCommmand, {
        expiresIn: 3600,
      });
      return url;
    } catch (err) {
      console.info(`failed to retrieve file with name ${docName} `);
      throw err;
    }
  }

  async listRagDocuments(): Promise<_Object[]> {
    const command = new ListObjectsV2Command({
      Bucket: this.s3BucketName,
    });

    try {
      const response = await this.s3Client.send(command);
      const objects: _Object[] = response.Contents || [];

      console.log(`Found ${objects.length} objects:`);
      return objects;
    } catch (error) {
      console.error('Error listing objects:', error);
      throw error;
    }
  }

  async getSignedUploadUrl(fileName: string): Promise<string> {
    try {
      const putObjectCommandInput: PutObjectCommandInput = {
        Bucket: this.s3BucketName,
        Key: fileName,
      };

      const putObjectCommmand = new PutObjectCommand(putObjectCommandInput);

      const url = await getSignedUrl(this.s3Client, putObjectCommmand, {
        expiresIn: 3600,
      });
      return url;
    } catch (err) {
      console.info(
        `failed to retrieve signed url for document with name ${fileName} `
      );
      throw err;
    }
  }
}
