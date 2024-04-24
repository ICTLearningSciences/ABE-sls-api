// tests/calculator.spec.tx
import { assert } from "chai";
import { createResponseJson } from "../../src/helpers.js";
import { createSlices } from "../../src/functions/timeline/use-with-get-document-timeline.js";
import nock from "nock";
import {
  externalGoogleDocRevisions as twoSessionsInbetweenOutsideABERevisions
}from "../fixtures/documents/2-sessions-inbetween-outside-ABE/external-google-doc-revisions.js";

import {
  docVersions as twoSessionsInbetweenOutsideABEDocVersions
} from "../fixtures/documents/2-sessions-inbetween-outside-ABE/gql-doc-versions.js";
import { IGDocVersion, TimelinePointType } from "../../src/functions/timeline/types.js";
import { mockExternalDocRevisionText } from "../helpers.js";
import { externalGoogleDocRevisionGenerator, gqlDocVersionGenerator, isoStringMinsFromNow } from "../fixtures/documents/helpers/document-generator.js";

describe("Document Timeline Unit Tests", () => {
  beforeEach(() => {
    mockExternalDocRevisionText("fake-text")
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
      // Test: should not make ANY calls to OpenAI since all the document timeline data already exists

    });

    it("generates change summary for documents when text changes (or is first version)", async () => {
      
    })

    it("generates reverse outline for documents when text changes (or is first version)", ()=>{

    })
  
  })

});