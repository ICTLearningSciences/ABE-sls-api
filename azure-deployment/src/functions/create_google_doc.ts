import { HttpRequest, InvocationContext, HttpResponseInit, app } from "@azure/functions";
import { createResponseJson, getAccessTokenFromRequest } from '../helpers.js';
import { createGoogleDoc, fetchInstructorEmails } from 'abe-sls-core-2';
export async function _createGoogleDoc(
    request: HttpRequest,
    context: InvocationContext,
  ): Promise<HttpResponseInit> {
  const adminEmails: string[] = process.env.ADMIN_EMAILS
    ? process.env.ADMIN_EMAILS.split(',')
    : [];
  const courseId = request.query.get("courseId")
  const userId = request.query.get("userId")
  const _userEmails = request.query.get("emails")
  const userEmails = _userEmails
    ? _userEmails.split(',').filter((e: string) => e)
    : [];
  const copyFromDocId = request.query.get("copyFromDocId")
  const newDocTitle = request.query.get("newDocTitle")
  const isAdminDoc = request.query.get("isAdminDoc")
  if (!userId) {
    return createResponseJson(400, { error: 'userId is required' });
  }
  const accessToken = getAccessTokenFromRequest(request);
  const instructorEmails = courseId ? await fetchInstructorEmails(courseId, accessToken) : [];
  const { docId, docUrl, createdTime } = await createGoogleDoc(
    adminEmails,
    userEmails,
    instructorEmails,
    copyFromDocId || '',
    newDocTitle || '',
    isAdminDoc || '',
    userId
  );
  return createResponseJson(200, {
    data: {
      docId: docId,
      userId: userId,
      docUrl: docUrl,
      createdTime: createdTime,
    }
  });
}


app.http('createGoogleDoc', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'create_google_doc',
    extraOutputs: [],
    handler: _createGoogleDoc,
});