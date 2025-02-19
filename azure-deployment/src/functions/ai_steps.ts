import { HttpRequest, InvocationContext, HttpResponseInit, app } from "@azure/functions";
import { aiStepsJobStatus, aiStepsRequest, getDocData } from "abe-sls-core-2";
import { createResponseJson, extractOpenAiRequestData } from "../helpers.js";
// modern module syntax
export async function _aiStepsRequest(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const { docsId, userId, aiPromptSteps, authHeaders, docService } =
    await extractOpenAiRequestData(request);
  
  try {
    const { jobId } = await aiStepsRequest(docsId, userId, aiPromptSteps, authHeaders, docService);
    return createResponseJson(200, { response: { jobId } });
  } catch (err) {
    console.error(err);
    return createResponseJson(500, { error: JSON.stringify(err) });
  }
}

export async function processAiStepsJob(
  documents: any[],
  context: InvocationContext
): Promise<void> {
  try {
    context.log('Processing new DB item');
    context.log(documents);
  } catch (error) {
      console.error(error)
  }
}

export async function _aiStepsJobStatus(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const jobId = request.params.jobId;
  if (!jobId) {
    return createResponseJson(400, {
      response: { error: 'jobId query string parameter is required' },
    });
  }
  try {
    const _aiStepsJobStatus = await aiStepsJobStatus(jobId);
    return createResponseJson(200, {
      response: {
        aiServiceResponse: _aiStepsJobStatus.aiServiceResponse,
        jobStatus: _aiStepsJobStatus.jobStatus,
        answer: _aiStepsJobStatus.answer,
        apiError: _aiStepsJobStatus.apiError,
      },
    });
  } catch (error) {
    return createResponseJson(500, {
      response: { error: `failed to get job status for jobId: ${jobId}` },
    });
  }
}

app.http('aiStepsRequest', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'async_open_ai_doc_question',
    extraOutputs: [],
    handler: _aiStepsRequest,
});

app.cosmosDB('aiStepsJobPro', {
  connection: 'CosmosDBConnectionString',
  databaseName: process.env.CosmosDBName,
  containerName: process.env.CosmosDBContainerName,
  handler: processAiStepsJob,
  leaseContainerName: process.env.CosmosDBLeaseContainerName,
});


app.http('aiStepsJobStatus', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'async_open_ai_doc_question_status',
  extraOutputs: [],
  handler: _aiStepsJobStatus,
});


