// Note: had to add .js to find this file in serverless
import { createResponseJson } from '../helpers.js';
import {useWithGoogleApi} from '../hooks/google_api.js';

export enum GoogleDocTextModifyActions {
    HIGHLIGHT="HIGHLIGHT",
    INSERT="INSERT",
    REMOVE="REMOVE",
}

// modern module syntax
export const handler = async (event:any) => {
    const {getGoogleAPIs, highlightGoogleDocText, removeGoogleDocText, insertGoogleDocText} = useWithGoogleApi();
    const {drive, docs} = await getGoogleAPIs();
    const queryParams = event["queryStringParameters"]
    const action = queryParams && "action" in queryParams ? event["queryStringParameters"]["action"] : ""
    const targetText = queryParams && "text" in queryParams ? event["queryStringParameters"]["text"] : ""
    const docId = queryParams && "docId" in queryParams ? event["queryStringParameters"]["docId"] : ""
    const insertAfterText = queryParams && "insertAfterText" in queryParams ? event["queryStringParameters"]["insertAfterText"] : ""

    if(!targetText){
        return createResponseJson(400, {error: "text is required query parameter"})
    }
    if(!docId){
        return createResponseJson(400, {error: "docId is a required query parameter"})
    }
    if(!action){
        return createResponseJson(400, {error: "action is a required query parameter"})
    }
    console.log(`action: ${action}, targetText: ${targetText}, docId: ${docId}`)
    try{
        if(action === GoogleDocTextModifyActions.HIGHLIGHT){
            await highlightGoogleDocText(docs, docId, targetText)
        }
        else if(action === GoogleDocTextModifyActions.REMOVE){
            await removeGoogleDocText(docs, docId, targetText)
        }
        else if(action === GoogleDocTextModifyActions.INSERT){
            if(!insertAfterText){
                return createResponseJson(400, {error: "insertAfterText is required query parameter for inserting"})
            }
            await insertGoogleDocText(docs, docId, targetText, insertAfterText);
        } else{
            return createResponseJson(400, {error: "action must be one of: " + Object.values(GoogleDocTextModifyActions).join(", ")})
        }
    }catch(e){
        console.error(e)
        return createResponseJson(500, {error: JSON.stringify(e)})
    }

    return createResponseJson(200, {})
}