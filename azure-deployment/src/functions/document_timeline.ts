import { HttpRequest, InvocationContext, HttpResponseInit, app } from "@azure/functions";
import { aiStepsJobStatus, aiStepsProcess, asyncDocumentTimelineProcess, asyncDocumentTimelineRequest, asyncDocumentTimelineStatus } from "abe-sls-core-2";
import { createResponseJson, getFieldFromEventBody } from "../helpers.js";
import { ExtractedOpenAiRequestData } from "abe-sls-core-2/dist/shared_functions/ai_steps_request/helpers.js";
import { AiAsyncJobStatus, DocServices, TargetAiModelServiceType } from "abe-sls-core-2/dist/types.js";
export interface ExtractedDocumentTimelineRequestData {
    docId: string;
    userId: string;
    targetAiService: TargetAiModelServiceType;
    docService: DocServices;
  }


// modern module syntax
export async function documentTimelineRequest(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const documentId = request.query.get('docId');
  const userId = request.query.get('userId');
  const docService = request.query.get('docService') || DocServices.GOOGLE_DOCS;
  const targetAiService: TargetAiModelServiceType = await getFieldFromEventBody(
    request,
    'targetAiService'
  );

  if (!documentId || !userId || !targetAiService) {
    throw new Error(
      'Missing required query parameters [docId, userId, targetAiService]'
    );
  }

  try {
    const { jobId } = await asyncDocumentTimelineRequest(
      documentId,
      userId,
      targetAiService,
      docService as DocServices
    );
    return createResponseJson(200, { response: { jobId } });
  } catch (err) {
    console.error(err);
    return createResponseJson(500, {
      response: { error: 'Failed to add job to dynamo db' },
    });
  }
}

export async function processDocumentTimelineJob(
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
      if(!document.timelineRequestData) {
        throw new Error('timelineRequestData not found for jobId: ' + jobId);
      }
      const timelineRequestData: ExtractedDocumentTimelineRequestData = JSON.parse(document.timelineRequestData);
      await asyncDocumentTimelineProcess(jobId, timelineRequestData);
    }
  } catch (error) {
      console.error(error)
  }
}

export async function _documentTimelineJobStatus(
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
    const _documentTimelineJobStatus = await asyncDocumentTimelineStatus(jobId);
    return createResponseJson(200, {
      response: {
        documentTimeline: _documentTimelineJobStatus.documentTimeline,
        jobStatus: _documentTimelineJobStatus.jobStatus,
      },
    });
  } catch (error) {
    return createResponseJson(500, {
      response: { error: `failed to get document timeline status for jobId: ${jobId}` },
    });
  }
}

app.http('async_document_timeline_request', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'async_get_document_timeline',
    extraOutputs: [],
    handler: documentTimelineRequest,
});

app.cosmosDB('async_document_timeline_process', {
  connection: 'CosmosDBConnectionString',
  databaseName: process.env.CosmosDBName,
  containerName: process.env.CosmosDBTimelineContainerName,
  handler: processDocumentTimelineJob,
  leaseContainerName: process.env.CosmosDBTimelineLeaseContainerName,
  leaseContainerPrefix: "async_document_timeline_process"
});


app.http('async_document_timeline_status', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'async_document_timeline_status',
  extraOutputs: [],
  handler: _documentTimelineJobStatus,
});


