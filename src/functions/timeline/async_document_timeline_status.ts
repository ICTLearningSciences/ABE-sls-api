
// Note: had to add .js to find this file in serverless
import requireEnv, { createResponseJson } from '../../helpers.js';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import {APIGatewayEvent} from 'aws-lambda';
import { GQLDocumentTimeline } from './types.js';

const jobsTableName = requireEnv('JOBS_TABLE_NAME');

// modern module syntax
export const handler = async (event: APIGatewayEvent) => {
    const jobId = event.queryStringParameters?.jobId;
    if(!jobId){
        return createResponseJson(400, {response: {error: "jobId query string parameter is required"}})
    }
    const dynamoDbClient = new DynamoDB({ region: "us-east-1"});
    try{
        const data = await dynamoDbClient.getItem({TableName: jobsTableName, Key: {id: {S: jobId}}})
        if(!data.Item){
            return createResponseJson(404, {response: {error: "Job not found"}})
        }
        const jobStatus = data.Item.job_status.S;
        const documentTimelineData = data.Item.documentTimeline.S;
        const documentTimeline: GQLDocumentTimeline = documentTimelineData ? JSON.parse(documentTimelineData) : null;
        return createResponseJson(200, {response: {
            documentTimeline,
            jobStatus
        }})
    }catch(err){
        console.error(err);
        return createResponseJson(500, {response: {error: `failed to get item from db for jobId: ${jobId}`}})
    }
}