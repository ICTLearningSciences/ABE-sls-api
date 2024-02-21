// Note: had to add .js to find this file in serverless
import {useWithGoogleApi} from '../hooks/google_api.js';

// modern module syntax
export const handler = async (event:any) => {
    const docsId = event["pathParameters"]["docs_id"]
    if(!docsId){
        throw new Error('Google Doc ID is empty');
    }
    const {getGoogleAPIs, getGoogleDocRevisions } = useWithGoogleApi()
    const {drive, docs} = await getGoogleAPIs()
    const revisions = await getGoogleDocRevisions(drive, docsId);
    
    const response = {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({
            revisions: revisions,
        }),
    };
    return response
}