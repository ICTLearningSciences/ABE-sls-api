
// Note: had to add .js to find this file in serverless
import requireEnv, { createResponseJson } from '../../helpers.js';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { OpenAiPromptResponse } from '../../types.js';
import {APIGatewayEvent} from 'aws-lambda';

const jobsTableName = requireEnv('JOBS_TABLE_NAME');

// modern module syntax
export const handler = async (event: APIGatewayEvent) => {
    const jobId = event.queryStringParameters?.jobId;
    if(!jobId){
        return createResponseJson(400, {response: {error: "jobId query string parameter is required"}})
    }
    // Queue the job
    // Store the job in dynamo db, triggers async lambda
    const dynamoDbClient = new DynamoDB({ region: "us-east-1"});
    try{
        const data = await dynamoDbClient.getItem({TableName: jobsTableName, Key: {id: {S: jobId}}})
        if(!data.Item){
            return createResponseJson(404, {response: {error: "Job not found"}})
        }
        const jobStatus = data.Item.job_status.S;
        const _openAiResponse = data.Item.openAiResponse.S;
        const openAiResponse: OpenAiPromptResponse | null = _openAiResponse ? JSON.parse(_openAiResponse) : null;
        return createResponseJson(200, {response: {
            openAiResponse,
            jobStatus
        }})
    }catch(err){
        console.error(err);
        return createResponseJson(500, {response: {error: `failed to get item from db for jobId: ${jobId}`}})
    }
}