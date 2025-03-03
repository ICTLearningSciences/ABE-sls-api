import {
    app,
    HttpRequest,
    HttpResponseInit,
    InvocationContext,
  } from '@azure/functions';
  import { getDocData } from 'abe-sls-core-2';
import { createResponseJson } from '../helpers.js';
  
  export async function GetDocData(
    request: HttpRequest,
    context: InvocationContext,
  ): Promise<HttpResponseInit> {
    try {
        const docsId = request.params.docs_id;
        const docService = request.params.doc_service;
        console.log(`docsId: ${docsId}, docService: ${docService}`);
        const docData = await getDocData(docsId, docService as any);
        return createResponseJson(200, docData);
    } catch (error) {
        context.error(error);
        return createResponseJson(500, error.message);
    }
}

app.http('GetDocData', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'get_doc_data/{docs_id}/{doc_service}',
    extraOutputs: [],
    handler: GetDocData,
});