import { assert, expect } from "chai";
import {findSubstringAfterSubstring} from "../../src/hooks/google_api";
import { DocEditLocation } from "../../src/doc_services/helpers/edit-doc-helpers";

describe("find substrings in paragraphs", ()=>{
    it("can find a target substring after a given substring in a list of paragraphs", ()=>{
        const paragraphData = [
            {allText: "This is a test", startIndex: 0, endIndex: 14},
            {allText: "Hello, world!", startIndex: 15, endIndex: 28},
            {allText: "This is a test", startIndex: 29, endIndex: 43},
            {allText: "Hello, world!", startIndex: 44, endIndex: 57},
            {allText: "This is a test", startIndex: 58, endIndex: 72},
            {allText: "Hello, world!", startIndex: 73, endIndex: 86},
        ];
        const targetSubstring = "Hello, world!";
        const location: DocEditLocation = {
            after: "This is a test",
            nthOccurrence: 2,
        }
        const result = findSubstringAfterSubstring(paragraphData, targetSubstring, location.after, location.nthOccurrence);
        expect(result).to.deep.equal({startIndex: 44, endIndex: 57});
    });

    it("can find a target substring after a given substring in a single paragraph", ()=>{
        const paragraphData = [
            {allText: "This is a test. Hello, world! This is a test. Hello, world! This is a test. Hello, world! This is a test. Hello, world!", startIndex: 0, endIndex: 14},
        ];
        const targetSubstring = "world";
        const location: DocEditLocation = {
            after: "This is a test",
            nthOccurrence: 2,
        }
        const result = findSubstringAfterSubstring(paragraphData, targetSubstring, location.after, location.nthOccurrence);
        expect(result).to.deep.equal({startIndex: 53, endIndex: 58});
    });

});