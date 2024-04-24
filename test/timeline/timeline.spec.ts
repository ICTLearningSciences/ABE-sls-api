// tests/calculator.spec.tx
import { assert } from "chai";
import { createResponseJson } from "../../src/helpers.js";
import { createSlices } from "../../src/functions/timeline/use-with-get-document-timeline.js";
import nock from "nock";
import {
  docVersions as twoSessionsOneOutsideABEDocVersions
} from "../fixtures/documents/2-sessions-1-outside-ABE/gql-doc-versions.js";
import {
  externalGoogleDocRevisions as twoSessionsOneOutsideABERevisions
} from "../fixtures/documents/2-sessions-1-outside-ABE/external-google-doc-revisions.js";

import {
  externalGoogleDocRevisions as twoSessionsInbetweenOutsideABERevisions
}from "../fixtures/documents/2-sessions-inbetween-outside-ABE/external-google-doc-revisions.js";

import {
  docVersions as twoSessionsInbetweenOutsideABEDocVersions
} from "../fixtures/documents/2-sessions-inbetween-outside-ABE/gql-doc-versions.js";
import { TimelinePointType } from "../../src/functions/timeline/types.js";
import { mockExternalDocRevisionText } from "../helpers.js";

describe("Document Timeline Unit Tests", () => {
  beforeEach(() => {
    mockExternalDocRevisionText("fake-text")
  })

  describe("createSlices", () => {
    it("Any google doc revisions after our last stored version is appended at the end", async () => {
      // const {getDocumentTimeline} = useWithGetDocumentTimeline();
      const res = await createSlices(twoSessionsOneOutsideABEDocVersions, twoSessionsOneOutsideABERevisions, "fake-key")
      assert.equal(res.length, 3);
      assert.equal(res[0].startReason, TimelinePointType.START);
      assert.equal(res[1].startReason, TimelinePointType.NEW_ACTIVITY);
      assert.equal(res[2].startReason, TimelinePointType.EDITED_OUTSIDE_OF_ABE);
    });

    it("An un-accounted-for change in versions text triggers a check for changes outside of ABE", async () => {
      const res = await createSlices(twoSessionsInbetweenOutsideABEDocVersions, twoSessionsInbetweenOutsideABERevisions, "fake-key")
      assert.equal(res.length, 4);
      const lastVersionText = res[0].versions[res[0].versions.length - 1].plainText;
      const startVersionText = res[2].versions[0].plainText;
      assert.notEqual(lastVersionText, startVersionText);
      assert.equal(res[0].startReason, TimelinePointType.START);
      assert.equal(res[1].startReason, TimelinePointType.EDITED_OUTSIDE_OF_ABE);
      assert.equal(res[2].startReason, TimelinePointType.NEW_ACTIVITY);
      assert.equal(res[3].startReason, TimelinePointType.NEW_ACTIVITY);
    });
  })

});