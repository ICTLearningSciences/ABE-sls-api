import { UpdateItemCommandInput } from "@aws-sdk/client-dynamodb";
import { AiAsyncJobStatus } from "../../types.js";
import { DocumentDBManager } from "../generic_classes/document_db_manager.js";
import { GQLDocumentTimeline } from "../../functions/timeline/functions/types.js";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import requireEnv from "../../helpers.js";

export class CosmosDBManager extends DocumentDBManager {

    constructor() {
        super();
    }

    async updateJobStatus(jobId: string, jobStatus: AiAsyncJobStatus): Promise<void> {
        throw new Error('Not implemented');
    }

    async storeDoctimeline(jobId: string, docTimeline: GQLDocumentTimeline, jobStatus: AiAsyncJobStatus): Promise<void> {
        throw new Error('Not implemented');
    }
}