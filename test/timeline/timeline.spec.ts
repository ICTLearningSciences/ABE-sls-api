// tests/calculator.spec.tx
import { assert } from "chai";
import { createSlices } from "../../src/functions/timeline/use-with-get-document-timeline.js";
import { IGDocVersion, TimelinePointType } from "../../src/functions/timeline/types.js";
import { mockDefault, mockGraphqlQuery } from "../helpers.js";
import { externalGoogleDocRevisionGenerator, gqlDocVersionGenerator, isoStringMinsFromNow } from "../fixtures/documents/helpers/document-generator.js";
import nock from "nock";
import { fetchDocTimeline } from "../../src/hooks/graphql_api.js";
import requireEnv from "../../src/helpers.js";

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
        "fetchDocTimeline": {
          "2": "2"
        }
      });
      const res = await fetchDocTimeline("fake-user-id", "fake-doc-id");
      console.log(res)
    });

    it("generates change summary for documents when text changes (or is first version)", async () => {
      
    })

    it("generates reverse outline for documents when text changes (or is first version)", ()=>{

    })

    it("stores document timeline in gql", ()=>{
      // Test: ensure a request is made to gql to store the document timeline
    })
  
  })

});