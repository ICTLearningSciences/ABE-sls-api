// Note: had to add .js to find this file in serverless
import requireEnv, { createResponseJson } from '../../helpers.js';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { extractOpenAiRequestData } from './open_ai.js';
import { OpenAiAsyncJobStatus } from '../../types.js';
import {APIGatewayEvent} from 'aws-lambda';
import {v4 as uuid} from 'uuid'

const jobsTableName = requireEnv('JOBS_TABLE_NAME');

// modern module syntax
export const handler = async (event: APIGatewayEvent) => {
    const {docsId, userId, systemPrompt, openAiModel, openAiPromptSteps, authHeaders} = extractOpenAiRequestData(event);
    // Queue the job
    const newUuid = uuid();
    // Store the job in dynamo db, triggers async lambda
    const dynamoDbClient = new DynamoDB({ region: "us-east-1"});
    const tableRequest = {
        TableName: jobsTableName,
        Item: {
            "id":{
                S: newUuid
            },
            "job_status":{
                S: OpenAiAsyncJobStatus.IN_PROGRESS
            },
            "answer":{
                S: ""
            },
            "openAiResponse":{
                S: ""
            },
            "openAiRequestData": {
                S: JSON.stringify({
                    docsId,
                    userId,
                    systemPrompt,
                    openAiModel,
                    openAiPromptSteps,
                    authHeaders
                })
            }
        }
    }
    try{
        await dynamoDbClient.putItem(tableRequest)
        return createResponseJson(200, {response: {jobId: newUuid}})
    }catch(err){
        console.error(err);
        return(createResponseJson(500, {response: {error: "Failed to add job to dynamo db"}}))
    }
}