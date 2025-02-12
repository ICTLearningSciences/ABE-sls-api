import { AiAsyncJobStatus } from "../../types.js";
import { DocumentDBManager } from "../generic_classes/document_db_manager.js";
import { GQLDocumentTimeline } from "../../functions/timeline/functions/types.js";
import { ExtractedOpenAiRequestData } from "../../functions/openai/helpers.js";

export class CosmosDBManager extends DocumentDBManager {
    constructor() {
        super();
    }

    async updateExistingItem(jobId: string, fields: Record<string, any>): Promise<void> {
        throw new Error('Not implemented');
    }

    async storeNewItem(jobId: string, fields: Record<string, any>): Promise<void> {
        throw new Error('Not implemented');
    }

    async getItem(jobId: string): Promise<any> {
        throw new Error('Not implemented');
    }
}