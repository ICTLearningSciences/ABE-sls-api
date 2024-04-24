// tests/calculator.spec.tx
import { assert } from "chai";
import { createSlices, useWithGetDocumentTimeline } from "../../src/functions/timeline/use-with-get-document-timeline.js";
import { IGDocVersion, TimelinePointType } from "../../src/functions/timeline/types.js";
import { defaultChangeSummaryRes, defaultReverseOutlineRes, mockDefault, mockGraphqlQuery, mockOpenAiCall, mockOpenAiChangeSummaryResponse, mockOpenAiReverseOutlineResponse } from "../helpers.js";
import { externalGoogleDocRevisionGenerator, gqlDocVersionGenerator, isoStringMinsFromNow } from "../fixtures/documents/helpers/document-generator.js";
import nock from "nock";
import { fetchDocTimeline } from "../../src/hooks/graphql_api.js";
import requireEnv from "../../src/helpers.js";
import { docTimeline } from "../fixtures/documents/2-sessions-inbetween-outside-ABE/doc-timeline.js";
import { ReverseOutline } from "../../src/functions/timeline/reverse-outline.js";

describe("Document Timeline Unit Tests", () => {
  beforeEach(() => {
    mockDefault()
  })

  afterEach(() => {
    // ensure nocks don't persist between tests
    nock.cleanAll();
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
      const res = await createSlices(gdocVersions, externalGoogleDocRevisions, "fake-key")
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
      
      const res = await createSlices(gdocVersions, externalGoogleDocRevisions, "fake-key")
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
      const {getDocumentTimeline} = useWithGetDocumentTimeline();

      const res = await getDocumentTimeline("fake-user", "fake-doc", [], "fake-key")

      assert.equal(openAiNocScope.isDone(), false); // no openAi calls should have occured since we utilize existing timeline
      assert.equal(res.timelinePoints.length, docTimeline.timelinePoints.length);
      for(let i = 0; i < res.timelinePoints.length; i++){
        assert.equal(res.timelinePoints[i].changeSummary, docTimeline.timelinePoints[i].changeSummary);
        assert.equal(res.timelinePoints[i].reverseOutline, docTimeline.timelinePoints[i].reverseOutline);
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
      let numChangeSummaryCalls = {
        calls: 0 // js object to force pass by reference
      }
      const openAiChangeSummaryCalls = mockOpenAiChangeSummaryResponse(
        defaultChangeSummaryRes,
        {
          interceptAllCalls: true,
          numCallsAccumulator: numChangeSummaryCalls
        }
      )
      let numReverseOutlineCalls = {
        calls: 0 // js object to force pass by reference
      }
      const reverseOutlineCalls = mockOpenAiReverseOutlineResponse(
        defaultReverseOutlineRes,
        {
          interceptAllCalls: true,
          numCallsAccumulator: numReverseOutlineCalls
        }
      )
      const {getDocumentTimeline} = useWithGetDocumentTimeline();
      const res = await getDocumentTimeline("fake-user", "fake-doc", [], "fake-key")
      assert.equal(openAiChangeSummaryCalls.isDone(), true);
      assert.equal(reverseOutlineCalls.isDone(), true);
      assert.equal(res.timelinePoints[0].changeSummary, defaultChangeSummaryRes);
      assert.equal(res.timelinePoints[0].reverseOutline, JSON.stringify(defaultReverseOutlineRes));
      assert.equal(res.timelinePoints[1].changeSummary, defaultChangeSummaryRes);
      assert.equal(res.timelinePoints[1].reverseOutline, JSON.stringify(defaultReverseOutlineRes));
      assert.equal(res.timelinePoints[2].changeSummary, 'No changes from previous version');
      assert.equal(res.timelinePoints[2].reverseOutline, JSON.stringify(defaultReverseOutlineRes)); // uses previous reverse outline
      assert.equal(numChangeSummaryCalls.calls, 2);
      assert.equal(numReverseOutlineCalls.calls, 2);
      assert.equal(storeDocTimelineNoc.isDone(), true);
    })

  })

});