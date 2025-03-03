import { HttpRequest, InvocationContext, HttpResponseInit, app } from "@azure/functions";
import { aiStepsJobStatus, aiStepsProcess, aiStepsRequest } from "abe-sls-core-2";
import { createResponseJson, extractOpenAiRequestData } from "../helpers.js";
import { ExtractedOpenAiRequestData } from "abe-sls-core-2/dist/shared_functions/ai_steps_request/helpers.js";
import { AiAsyncJobStatus } from "abe-sls-core-2/dist/types.js";
// modern module syntax
export async function _aiStepsRequest(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const { docsId, userId, aiPromptSteps, authHeaders, docService } =
    await extractOpenAiRequestData(request);
  
  try {
    const { jobId } = await aiStepsRequest(docsId, userId, aiPromptSteps, authHeaders, docService);
    return createResponseJson(200, {data: { response: { jobId } }});
  } catch (err) {
    console.error(err);
    return createResponseJson(500, { data: { error: JSON.stringify(err) } });
  }
}

export async function processAiStepsJob(
  documents: any[],
  context: InvocationContext
): Promise<void> {
  try {
    context.log('Processing new DB item');
    context.log(documents);
    for (let document of documents) {
      if(document.job_status !== AiAsyncJobStatus.QUEUED) {
        // Only process queued jobs
        continue;
      }
      const jobId = document.id;
      if(!document.openAiRequestData) {
        throw new Error('openAiRequestData not found for jobId: ' + jobId);
      }
      const openAiRequestData: ExtractedOpenAiRequestData = JSON.parse(document.openAiRequestData);
      await aiStepsProcess(jobId, openAiRequestData);
    }
  } catch (error) {
      console.error(error)
  }
}

export async function _aiStepsJobStatus(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const jobId = request.query.get('jobId');
  if (!jobId) {
    return createResponseJson(400, {
      response: { error: 'jobId query string parameter is required' },
    });
  }
  try {
    const _aiStepsJobStatus = await aiStepsJobStatus(jobId);
    return createResponseJson(200, {
      data: {
        response: {
          aiServiceResponse: _aiStepsJobStatus.aiServiceResponse,
          jobStatus: _aiStepsJobStatus.jobStatus,
          answer: _aiStepsJobStatus.answer,
          apiError: _aiStepsJobStatus.apiError,
        },
      }
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
  containerName: process.env.CosmosDBAiStepContainerName,
  handler: processAiStepsJob,
  leaseContainerName: process.env.CosmosDBAiStepLeaseContainerName,
});


app.http('aiStepsJobStatus', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'async_open_ai_doc_question_status',
  extraOutputs: [],
  handler: _aiStepsJobStatus,
});


