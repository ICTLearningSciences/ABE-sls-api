// tests/calculator.spec.tx
import { assert } from "chai";
import { DocumentTimelineGenerator, createSlices } from "../../src/functions/timeline/functions/document-timeline-generator.js";
import { GQLDocumentTimeline, IGDocVersion, AiGenerationStatus, TimelinePointType } from "../../src/functions/timeline/functions/types.js";
import { defaultChangeSummaryRes, defaultReverseOutlineRes, mockDefault, mockGraphqlQuery, mockOpenAiCall, mockOpenAiChangeSummaryResponse, mockOpenAiReverseOutlineResponse } from "../helpers.js";
import { externalGoogleDocRevisionGenerator, gqlDocVersionGenerator, isoStringMinsFromNow } from "../fixtures/documents/helpers/document-generator.js";
import { docTimeline } from "../fixtures/documents/2-sessions-inbetween-outside-ABE/doc-timeline.js";
import {ddbMock} from "../init.spec.js";
import { UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { AiAsyncJobStatus, DefaultGptModels, DocServices } from "../../src/types.js";
import {AvailableAiServiceNames} from '../../src/ai_services/ai-service-factory.js'
import {DocServiceFactory} from '../../src/doc_services/doc-service-factory.js'
import sinon from "sinon";
import { GoogleDocService } from "../../src/doc_services/google-doc-services.js";
import { useWithGoogleApi } from "../../src/hooks/google_api.js";
describe("Document Timeline Unit Tests", () => {
  beforeEach(() => {
    mockDefault()
  })

  describe("createSlices", () => {
    it("Any google doc revisions after our last stored version is appended at the end", async () => {
      const gdocVersions: IGDocVersion[] = gqlDocVersionGenerator([
        {},
        {activity: "123", createdAt: isoStringMinsFromNow(1)},
        {activity: "123", createdAt: isoStringMinsFromNow(2)}
      ])
      const externalGoogleDocRevisions = externalGoogleDocRevisionGenerator(
        [
          {modifiedTime: isoStringMinsFromNow(3)}
        ]
      )
      const googleDocService = new GoogleDocService({} as any);
      const mockGetGoogleAPIs = sinon.stub().resolves({
        drive: {} as any,
        docs: {} as any,
        accessToken: 'fake-access-token'
      });
      googleDocService.useWithGoogleApi = {
        ...useWithGoogleApi(),
        getGoogleAPIs: mockGetGoogleAPIs
      };
      const res = await createSlices(gdocVersions, externalGoogleDocRevisions, googleDocService)
      assert.equal(res.length, 3);
      assert.equal(res[0].startReason, TimelinePointType.START);
      assert.equal(res[1].startReason, TimelinePointType.NEW_ACTIVITY);
      assert.equal(res[2].startReason, TimelinePointType.EDITED_OUTSIDE_OF_ABE);
    });

    it("An un-accounted-for change in versions text triggers a check for changes outside of ABE", async () => {
        const gdocVersions: IGDocVersion[] = gqlDocVersionGenerator([
          {},
          {activity: "123", plainText: "unnacounted for changed text", createdAt: isoStringMinsFromNow(2)},
        ])
        const externalGoogleDocRevisions = externalGoogleDocRevisionGenerator(
          [
            {modifiedTime: isoStringMinsFromNow(1)}
          ]
        ) 
        const googleDocService = new GoogleDocService({} as any);
        const mockGetGoogleAPIs = sinon.stub().resolves({
          drive: {} as any,
          docs: {} as any,
          accessToken: 'fake-access-token'
        });
        googleDocService.useWithGoogleApi = {
          ...useWithGoogleApi(),
          getGoogleAPIs: mockGetGoogleAPIs
        };
      const res = await createSlices(gdocVersions, externalGoogleDocRevisions, googleDocService)
      assert.equal(res.length, 3);
      const lastVersionText = res[0].versions[res[0].versions.length - 1].plainText;
      const startVersionText = res[2].versions[0].plainText;
      assert.notEqual(lastVersionText, startVersionText);
      assert.equal(res[0].startReason, TimelinePointType.START);
      assert.equal(res[1].startReason, TimelinePointType.EDITED_OUTSIDE_OF_ABE);
      assert.equal(res[2].startReason, TimelinePointType.NEW_ACTIVITY);
    });
  })

  describe("getDocumentTimeline", () => {
    it("merges in existing document timeline", async () => {
      mockGraphqlQuery("FetchDocTimeline", {
        "fetchDocTimeline": docTimeline
      });
      const versionsFromDocTimeline = docTimeline.timelinePoints.map((timelinePoint) => timelinePoint.version)
      mockGraphqlQuery("FetchGoogleDocVersions", {
        "fetchGoogleDocVersions": versionsFromDocTimeline
      });
      mockGraphqlQuery("StoreDocTimeline", {
        "storeDocTimeline": docTimeline
      })
      const openAiNocScope = mockOpenAiCall(
        "fake-summary"
      )
      const docTimelineGenerator = new DocumentTimelineGenerator({
        serviceName:AvailableAiServiceNames.OPEN_AI,
        model: DefaultGptModels.OPEN_AI_GPT_3_5
      })
      const externalDocService = DocServiceFactory.getDocService(DocServices.GOOGLE_DOCS, {})

      const res = await docTimelineGenerator.getDocumentTimeline("","fake-user", "fake-doc", [], externalDocService)

      assert.equal(openAiNocScope.isDone(), false); // no openAi calls should have occured since we utilize existing timeline
      assert.equal(res.timelinePoints.length, docTimeline.timelinePoints.length);
      for(let i = 0; i < res.timelinePoints.length; i++){
        assert.equal(res.timelinePoints[i].changeSummary, docTimeline.timelinePoints[i].changeSummary);
        assert.equal(res.timelinePoints[i].changeSummaryStatus, AiGenerationStatus.COMPLETED);
        assert.equal(res.timelinePoints[i].reverseOutline, docTimeline.timelinePoints[i].reverseOutline);
        assert.equal(res.timelinePoints[i].reverseOutlineStatus, AiGenerationStatus.COMPLETED);
        assert.equal(res.timelinePoints[i].versionTime, docTimeline.timelinePoints[i].versionTime);
      }
    });

    
    it("generates change summary only for documents when text changes (or is first version)", async () => {
      const gdocVersions: IGDocVersion[] = gqlDocVersionGenerator([
        {},
        {activity: "123", plainText: "changed text", createdAt: isoStringMinsFromNow(2)},
        {activity: "321", plainText: "changed text", createdAt: isoStringMinsFromNow(3)}, // same text means no generation
      ])
      mockGraphqlQuery("FetchDocTimeline", {
        "fetchDocTimeline": undefined
      });
      mockGraphqlQuery("FetchGoogleDocVersions", {
        "fetchGoogleDocVersions": gdocVersions
      });
      const storeDocTimelineNoc = mockGraphqlQuery("StoreDocTimeline", {
        "storeDocTimeline": docTimeline
      })
      const [openAiChangeSummaryNock, csNockRequestData] = mockOpenAiChangeSummaryResponse(
        defaultChangeSummaryRes,
        {
          interceptAllCalls: true,
        }
      )
      const [reverseOutlineNock, roRequestData] = mockOpenAiReverseOutlineResponse(
        defaultReverseOutlineRes,
        {
          interceptAllCalls: true,
        }
      )
      const docTimelineGenerator = new DocumentTimelineGenerator({
        serviceName:AvailableAiServiceNames.OPEN_AI,
        model: DefaultGptModels.OPEN_AI_GPT_3_5
      })
      const externalDocService = DocServiceFactory.getDocService(DocServices.GOOGLE_DOCS, {})
      const res = await docTimelineGenerator.getDocumentTimeline("","fake-user", "fake-doc", [], externalDocService)
      assert.equal(openAiChangeSummaryNock.isDone(), true);
      assert.equal(reverseOutlineNock.isDone(), true);
      assert.equal(res.timelinePoints[0].changeSummary, defaultChangeSummaryRes);
      assert.equal(res.timelinePoints[0].changeSummaryStatus, AiGenerationStatus.COMPLETED);
      assert.equal(res.timelinePoints[0].reverseOutline, JSON.stringify(defaultReverseOutlineRes));
      assert.equal(res.timelinePoints[0].reverseOutlineStatus, AiGenerationStatus.COMPLETED);
      assert.equal(res.timelinePoints[1].changeSummary, defaultChangeSummaryRes);
      assert.equal(res.timelinePoints[1].changeSummaryStatus, AiGenerationStatus.COMPLETED);
      assert.equal(res.timelinePoints[1].reverseOutline, JSON.stringify(defaultReverseOutlineRes));
      assert.equal(res.timelinePoints[1].reverseOutlineStatus, AiGenerationStatus.COMPLETED);
      assert.equal(res.timelinePoints[2].changeSummary, 'No changes from previous version');
      assert.equal(res.timelinePoints[2].changeSummaryStatus, AiGenerationStatus.COMPLETED);
      assert.equal(res.timelinePoints[2].reverseOutline, JSON.stringify(defaultReverseOutlineRes)); // uses previous reverse outline
      assert.equal(res.timelinePoints[2].reverseOutlineStatus, AiGenerationStatus.COMPLETED);
      assert.equal(csNockRequestData.calls, 2);
      assert.equal(roRequestData.calls, 2);
      assert.equal(storeDocTimelineNoc.isDone(), true);
    })


    it("Generates the first and last 5 summaries/outlines", async () => {
      const gdocVersions: IGDocVersion[] = gqlDocVersionGenerator([
        {activity: "0", plainText: "changed text 0", createdAt: isoStringMinsFromNow(1)},
        {activity: "1", plainText: "changed text 1", createdAt: isoStringMinsFromNow(2)},
        {activity: "2", plainText: "changed text 2", createdAt: isoStringMinsFromNow(3)}, 
        {activity: "3", plainText: "changed text 3", createdAt: isoStringMinsFromNow(4)}, 
        {activity: "4", plainText: "changed text 4", createdAt: isoStringMinsFromNow(5)}, 
        {activity: "5", plainText: "changed text 5", createdAt: isoStringMinsFromNow(6)}, 
        {activity: "6", plainText: "changed text 6", createdAt: isoStringMinsFromNow(7)}, 
        {activity: "7", plainText: "changed text 7", createdAt: isoStringMinsFromNow(8)}, 
        {activity: "8", plainText: "changed text 8", createdAt: isoStringMinsFromNow(9)}, 
        {activity: "9", plainText: "changed text 9", createdAt: isoStringMinsFromNow(10)},
        {activity: "10", plainText: "changed text 10", createdAt: isoStringMinsFromNow(11)},
        {activity: "11", plainText: "changed text 11", createdAt: isoStringMinsFromNow(12)},
        {activity: "12", plainText: "changed text 12", createdAt: isoStringMinsFromNow(13)},
        {activity: "13", plainText: "changed text 13", createdAt: isoStringMinsFromNow(14)},
        {activity: "14", plainText: "changed text 14", createdAt: isoStringMinsFromNow(15)},
        {activity: "15", plainText: "changed text 15", createdAt: isoStringMinsFromNow(16)},
      ])
      mockGraphqlQuery("FetchDocTimeline", {
        "fetchDocTimeline": undefined
      });
      mockGraphqlQuery("FetchGoogleDocVersions", {
        "fetchGoogleDocVersions": gdocVersions
      });
      const storeDocTimelineNoc = mockGraphqlQuery("StoreDocTimeline", {
        "storeDocTimeline": docTimeline
      })
      const [openAiChangeSummaryNock, csRequestData] = mockOpenAiChangeSummaryResponse(
        defaultChangeSummaryRes,
        {
          interceptAllCalls: true,
        }
      )
      const [reverseOutlineNock, roRequestData] = mockOpenAiReverseOutlineResponse(
        defaultReverseOutlineRes,
        {
          interceptAllCalls: true,
        }
      )
      const docTimelineGenerator = new DocumentTimelineGenerator({
        serviceName:AvailableAiServiceNames.OPEN_AI,
        model: DefaultGptModels.OPEN_AI_GPT_3_5
      })
      const externalDocService = DocServiceFactory.getDocService(DocServices.GOOGLE_DOCS, {})
      await docTimelineGenerator.getDocumentTimeline("","fake-user", "fake-doc", [], externalDocService)
      assert.equal(openAiChangeSummaryNock.isDone(), true);
      assert.equal(reverseOutlineNock.isDone(), true);
      assert.equal(storeDocTimelineNoc.isDone(), true);
      assert.equal(csRequestData.calls, 16);
      assert.equal(roRequestData.calls, 16);
      // check that the first request to dynamoDb has first and last 5 complete, but others in progress
      // check that the second request to dynamoDb has all 16 complete
      const updateDynamoDbCalls = ddbMock.commandCalls(UpdateItemCommand)
      assert.equal(updateDynamoDbCalls.length, 2);
      const firstUpdate = updateDynamoDbCalls[0];
      const secondUpdate = updateDynamoDbCalls[1];

      const firstStoredDocumentTimeline: GQLDocumentTimeline = JSON.parse(firstUpdate.args[0].input.ExpressionAttributeValues?.[":documentTimeline"]["S"] || "{}");
      const firstStoredJobStatus = firstUpdate.args[0].input.ExpressionAttributeValues?.[":job_status"]["S"]

      const secondStoredDocumentTimeline: GQLDocumentTimeline = JSON.parse(secondUpdate.args[0].input.ExpressionAttributeValues?.[":documentTimeline"]["S"] || "{}");
      const secondStoredJobStatus = secondUpdate.args[0].input.ExpressionAttributeValues?.[":job_status"]["S"]
      assert.equal(firstStoredDocumentTimeline.timelinePoints.length, 16);
      assert.equal(firstStoredJobStatus, AiAsyncJobStatus.IN_PROGRESS);
      assert.equal(secondStoredDocumentTimeline.timelinePoints.length, 16);
      assert.equal(secondStoredJobStatus, AiAsyncJobStatus.COMPLETE);
      // first 5 and last 5 should be completed, but no others
      for(let i = 0; i < firstStoredDocumentTimeline.timelinePoints.length; i++){
        if(i < 5 || i > 10){
          assert.equal(firstStoredDocumentTimeline.timelinePoints[i].changeSummaryStatus, AiGenerationStatus.COMPLETED);
          assert.equal(firstStoredDocumentTimeline.timelinePoints[i].changeSummary, defaultChangeSummaryRes);
          assert.equal(firstStoredDocumentTimeline.timelinePoints[i].reverseOutlineStatus, AiGenerationStatus.COMPLETED);
          assert.equal(firstStoredDocumentTimeline.timelinePoints[i].reverseOutline, JSON.stringify(defaultReverseOutlineRes));
        }
        else{
          assert.equal(firstStoredDocumentTimeline.timelinePoints[i].changeSummaryStatus, AiGenerationStatus.IN_PROGRESS);
          assert.equal(firstStoredDocumentTimeline.timelinePoints[i].changeSummary, "");
          assert.equal(firstStoredDocumentTimeline.timelinePoints[i].reverseOutlineStatus, AiGenerationStatus.IN_PROGRESS);
          assert.equal(firstStoredDocumentTimeline.timelinePoints[i].reverseOutline, "");
        }
      }
      // now all complete
      for(let i = 0; i < secondStoredDocumentTimeline.timelinePoints.length; i++){
          assert.equal(secondStoredDocumentTimeline.timelinePoints[i].changeSummaryStatus, AiGenerationStatus.COMPLETED);
          assert.equal(secondStoredDocumentTimeline.timelinePoints[i].changeSummary, defaultChangeSummaryRes);
          assert.equal(secondStoredDocumentTimeline.timelinePoints[i].reverseOutlineStatus, AiGenerationStatus.COMPLETED);
          assert.equal(secondStoredDocumentTimeline.timelinePoints[i].reverseOutline, JSON.stringify(defaultReverseOutlineRes));
      }
    })


  })

});