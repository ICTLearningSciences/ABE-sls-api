// Note: had to add .js to find this file in serverless
import {useWithOpenAI} from '../../hooks/use-with-open-ai.js';
import { DynamoDBStreamEvent } from 'aws-lambda';
import { ExtractedOpenAiRequestData } from './open_ai.js';
import { OpenAiAsyncJobStatus } from '../../types.js';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import requireEnv from '../../helpers.js';

const jobsTableName = requireEnv('JOBS_TABLE_NAME');

// modern module syntax
export const handler = async (event: DynamoDBStreamEvent) => {
    const records = event.Records.filter((record) => record.eventName === "INSERT" && record.dynamodb?.NewImage);
    for(let record of records){
        const newImage = record.dynamodb?.NewImage;
        const openAiRequestData: ExtractedOpenAiRequestData = JSON.parse(newImage?.openAiRequestData.S || "");
        const jobId = newImage?.id?.S;
        if(!openAiRequestData || !jobId){
            console.error("openAiRequestData/jobId not found in dynamo db record");
            continue;
        }
        const {docsId, userId, systemPrompt, openAiModel, openAiPromptSteps, authHeaders} = openAiRequestData;
        const {asyncAskAboutGDoc} = useWithOpenAI();
        try{
            // Don't need to return anything, just need to process the async request.
            const openAiResponse = await asyncAskAboutGDoc(docsId, userId, openAiPromptSteps, systemPrompt, authHeaders, openAiModel);
            // Update the job in dynamo db
            const dynamoDbClient = new DynamoDB({ region: "us-east-1"});
            const tableRequest = {
                TableName: jobsTableName,
                Key: {
                    "id":{
                        S: jobId
                    }
                },
                UpdateExpression: "set openAiResponse = :openAiResponse, job_status = :job_status, answer = :answer",
                ExpressionAttributeValues: {
                    ":openAiResponse": {
                        S: JSON.stringify(openAiResponse)
                    },
                    ":job_status": {
                        S: OpenAiAsyncJobStatus.COMPLETE
                    },
                    ":answer": {
                        S: openAiResponse.answer
                    }
                }
            }
            await dynamoDbClient.updateItem(tableRequest).catch((err) => {
                console.error(err);
            })
        }
        catch(err){
            console.error(err);
        }
    }
}