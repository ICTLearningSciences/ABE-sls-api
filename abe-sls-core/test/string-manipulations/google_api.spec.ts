import { expect } from "chai";
import {findSubstringInParagraphMapping} from "../../src/hooks/google_api";
import { DocTextMapping } from "../../src/doc_services/abstract-doc-service";
describe("find substrings in paragraphs", ()=>{
    it("can find a target substring after a given substring in a list of paragraphs", ()=>{
        const docTextMapping: DocTextMapping = {
            paragraphId: "1",
            paragraphIndex: 0,
            paragraphText: "This is a test. Hello, world! This is a test. Hello, world! This is a test. Hello, world! This is a test. Hello, world!",
            paragraphStartIndex: 0,
            paragraphEndIndex: 14,
        }
        const result = findSubstringInParagraphMapping(docTextMapping, "Hello, world!");
        expect(result).to.deep.equal({startIndex: 16, endIndex: 29});
    });

});