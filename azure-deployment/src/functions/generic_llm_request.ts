import { HttpRequest, InvocationContext, HttpResponseInit, app } from "@azure/functions";
import { genericRequest, genericRequestProcess, genericRequestStatus } from "abe-sls-core-2";
import { createResponseJson, extractGenericRequestData } from "../helpers.js";
import { AiAsyncJobStatus } from "abe-sls-core-2/dist/types.js";
import { GenericLlmRequest, GenericLlmRequestData } from "abe-sls-core-2/dist/generic_llm_request/helpers.js";
// modern module syntax
export async function _genericRequest(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const { llmRequest } = await extractGenericRequestData(request);
  context.log('llmRequest');
  context.log(llmRequest);
  try {
    const { jobId } = await genericRequest(llmRequest);
    return createResponseJson(200, { response: { jobId } });
  } catch (err) {
    console.error(err);
    return createResponseJson(500, {
      response: { error: `failed to get status` },
    });
  }
}

export async function processGenericRequest(
  documents: any[],
  context: InvocationContext
): Promise<void> {
  try {
    for (let document of documents) {
      if(document.job_status !== AiAsyncJobStatus.QUEUED) {
        // Only process queued jobs
        continue;
      }
      context.log('Processing new DB item');
      context.log(documents);
      const jobId = document.id;
      if(!document.requestData) {
        context.log(document)
        throw new Error('requestData not found for jobId: ' + jobId);
      }
      const llmRequestData: GenericLlmRequest = JSON.parse(document.requestData);
      await genericRequestProcess(jobId, {llmRequest: llmRequestData});
    }
  } catch (error) {
      console.error(error)
  }
}

export async function _genericRequestStatus(
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
    const _genericRequestStatus = await genericRequestStatus(jobId);
    return createResponseJson(200, {
      response: {
        aiServiceResponse: _genericRequestStatus.aiServiceResponse,
        jobStatus: _genericRequestStatus.jobStatus,
        answer: _genericRequestStatus.answer,
        apiError: _genericRequestStatus.apiError,
      },
    });
  } catch (error) {
    return createResponseJson(500, {
      response: { error: `failed to get job status for jobId: ${jobId}` },
    });
  }
}

app.http('genericRequest', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'generic_llm_request',
    extraOutputs: [],
    handler: _genericRequest,
});

app.cosmosDB('genericRequestProcess', {
  connection: 'CosmosDBConnectionString',
  databaseName: process.env.CosmosDBName,
  containerName: process.env.CosmosDBGenericRequestContainerName,
  handler: processGenericRequest,
  leaseContainerName: process.env.CosmosDBGenericRequestLeaseContainerName,
});


app.http('genericRequestStatus', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'generic_llm_request_status',
  extraOutputs: [],
  handler: _genericRequestStatus,
});


