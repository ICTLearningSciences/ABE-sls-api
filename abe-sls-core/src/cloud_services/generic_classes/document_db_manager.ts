import { DynamoDBManager } from "../aws/dynamo_db_manager.js";
import { GQLDocumentTimeline } from "../../functions/timeline/functions/types.js";
import { AiAsyncJobStatus } from "../../types.js";
import { CloudServices } from "./types.js";
import { CosmosDBManager } from "../azure/cosmos_db_manager.js";
import { ExtractedOpenAiRequestData } from "../../functions/openai/helpers.js";

export interface JobStatusRes{
    aiServiceResponse: string;
    jobStatus: AiAsyncJobStatus;
    answer: string;
    apiError: string;
}

export abstract class DocumentDBManager {
    abstract updateExistingItem(jobId: string, fields: Record<string, any>): Promise<void>;
    abstract storeNewItem(jobId: string, fields: Record<string, any>): Promise<void>;
    abstract getItem(jobId: string): Promise<any>;
}

function getCloudService(): CloudServices {
    const val = process.env['CLOUD_SERVICE'];
    if (val) {
        if (Object.values(CloudServices).includes(val as CloudServices)) {
            return val as CloudServices;
        }else{
            throw new Error(`Invalid CLOUD_SERVICE: ${val}`);
        }
    }
    throw new Error('CLOUD_SERVICE is not defined');
}

export function getDocumentDBManager(): DocumentDBManager {
    const cloudService = getCloudService();
    switch (cloudService) {
        case CloudServices.AWS:
            return new DynamoDBManager();
        case CloudServices.AZURE:
            return new CosmosDBManager();
    }
}