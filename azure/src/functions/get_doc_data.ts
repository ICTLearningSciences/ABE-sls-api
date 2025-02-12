import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

export async function HttpExample(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const docsId = request.query.get('docs_id');
    const docService = request.query.get('doc_service');
    if (!docsId || !docService) {
      throw new Error('Google Doc ID or Doc Service is empty');
    }

    const docData = await getDocData(docsId, docService);

    const response = {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(docData),
    };
    return response;
};

app.http('HttpExample', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: HttpExample
});
