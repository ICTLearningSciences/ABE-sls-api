import { APIGatewayEvent } from 'aws-lambda';
import { useWithGetDocumentTimeline } from './use-with-get-document-timeline.js';
import { createResponseJson } from '../../helpers.js';


// modern module syntax
export const handler = async (event: APIGatewayEvent) => {
    const documentId = event.queryStringParameters?.["docId"];
    const userId = event.queryStringParameters?.["userId"];
    if(!documentId || !userId){
        throw new Error('Missing required query parameters [docId, userId]');
    }
    const {getDocumentTimeline} = useWithGetDocumentTimeline();
    const documentTimeline = await getDocumentTimeline(userId, documentId);
    return createResponseJson(200, documentTimeline);
}