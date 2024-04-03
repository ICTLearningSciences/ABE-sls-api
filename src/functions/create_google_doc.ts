// Note: had to add .js to find this file in serverless
import { createResponseJson } from '../helpers.js';
import {useWithGoogleApi} from '../hooks/google_api.js';
import { storeGoogleDoc } from '../hooks/graphql_api.js';

// modern module syntax
export const handler = async (event:any) => {
  const {getGoogleAPIs, createGoogleDoc} = useWithGoogleApi()
  const {drive, docs} = await getGoogleAPIs()
  const queryParams = event["queryStringParameters"]
  const adminEmails: string[] = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(",") : []
  const userId = queryParams && "userId" in queryParams ? event["queryStringParameters"]["userId"] : ""
  const userEmails = queryParams && "emails" in queryParams ? event["queryStringParameters"]["emails"].split(",").filter((e: string)=>e) : []
  const copyFromDocId = queryParams && "copyFromDocId" in queryParams ? event["queryStringParameters"]["copyFromDocId"] : ""
  const newDocTitle = queryParams && "newDocTitle" in queryParams ? event["queryStringParameters"]["newDocTitle"] : ""
  const isAdminDoc = queryParams && "isAdminDoc" in queryParams ? event["queryStringParameters"]["isAdminDoc"] : ""
  if(!userId){
    return createResponseJson(400, {error: "userId is required"})
  }
  const {docId, webViewLink, createdTime} = await createGoogleDoc(drive, [...adminEmails, ...userEmails], copyFromDocId, newDocTitle)
  const storedDoc = await storeGoogleDoc(docId, userId, isAdminDoc === "true", newDocTitle);
  return createResponseJson(200, {
    docId: docId,
    userId: userId,
    docUrl: webViewLink,
    createdTime: createdTime
  })
}