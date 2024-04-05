// Note: had to add .js to find this file in serverless
import { DynamoDBStreamEvent } from 'aws-lambda';
import { OpenAiAsyncJobStatus } from '../../types.js';
import { DynamoDB, UpdateItemCommandInput } from '@aws-sdk/client-dynamodb';
import requireEnv from '../../helpers.js';
import { useWithGetDocumentTimeline } from './use-with-get-document-timeline.js';
import { useWithGoogleApi } from '../../hooks/google_api.js';

const jobsTableName = requireEnv('JOBS_TABLE_NAME');

interface ExtractedDocumentTimelineRequestData {
    docId: string;
    userId: string;
}
 
// modern module syntax
export const handler = async (event: DynamoDBStreamEvent) => {
    const records = event.Records.filter((record) => record.eventName === "INSERT" && record.dynamodb?.NewImage);
    for(let record of records){
        const newImage = record.dynamodb?.NewImage;
        const requestData = newImage?.timelineRequestData.S;
        const docTimelineRequestData: ExtractedDocumentTimelineRequestData | undefined = requestData ? JSON.parse(requestData) : undefined;
        const jobId = newImage?.id?.S;
        if(!docTimelineRequestData || !jobId){
            console.error("docTimelineRequestData/jobId not found in dynamo db record");
            continue;
        }
        const {docId, userId} = docTimelineRequestData;
        const {getGoogleAPIs, getGoogleDocVersions} = useWithGoogleApi()
        const {drive, docs, accessToken} = await getGoogleAPIs()
        const googleDocVersions = await getGoogleDocVersions(drive, docId, accessToken || "");
        const {getDocumentTimeline} = useWithGetDocumentTimeline();
        try{
            // Don't need to return anything, just need to process the async request.
            const dynamoDbClient = new DynamoDB({ region: "us-east-1"});
            const documentTimelineRes = await getDocumentTimeline(userId, docId, googleDocVersions);
            // Update the job in dynamo db
            const tableRequest: UpdateItemCommandInput = {
                TableName: jobsTableName,
                Key: {
                    "id":{
                        S: jobId
                    }
                },
                UpdateExpression: "set documentTimeline = :documentTimeline, job_status = :job_status",
                ExpressionAttributeValues: {
                    ":documentTimeline": {
                        S: JSON.stringify(documentTimelineRes)
                    },
                    ":job_status": {
                        S: OpenAiAsyncJobStatus.COMPLETE
                    },
                }
            }
            await dynamoDbClient.updateItem(tableRequest).catch((err) => {
                console.error(err);
            }).then(()=>{
                console.log("Updated dynamo db record")
            })
        }
        catch(err){
            console.error(err);
        }
    }
}