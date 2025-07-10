import { expect } from "chai";
import {findSubstringInParagraphs} from "../../src/hooks/google_api";
import { InsertTextAction } from "../../src/doc_services/helpers/edit-doc-helpers";

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
        const location: InsertTextAction = {
            textToInsert: "Hello, world!",
            insertAfterText: "This is a test",
            nthInsertAfterTextOccurrence: 2,
        }
        const result = findSubstringInParagraphs(paragraphData, location.insertAfterText, location.nthInsertAfterTextOccurrence);
        expect(result).to.deep.equal({startIndex: 29, endIndex: 43});
    });

    it("can find a target substring after a given substring in a single paragraph", ()=>{
        const paragraphData = [
            {allText: "This is a test. Hello, world! This is a test. Hello, world! This is a test. Hello, world! This is a test. Hello, world!", startIndex: 0, endIndex: 14},
        ];
        const location: InsertTextAction = {
            textToInsert: "Hello, world!",
            insertAfterText: "This is a test",
            nthInsertAfterTextOccurrence: 2,
            }
            const result = findSubstringInParagraphs(paragraphData, location.insertAfterText, location.nthInsertAfterTextOccurrence);
        expect(result).to.deep.equal({startIndex: 30, endIndex: 44});
    });
    
    it("returns -1 if the target substring occurrence is not found", ()=>{
        const paragraphData = [
            {allText: "This is a test", startIndex: 0, endIndex: 14},
        ];
        const location: InsertTextAction = {
            textToInsert: "Hello, world!",
            insertAfterText: "This is a test",
            nthInsertAfterTextOccurrence: 2,
        }
        const result = findSubstringInParagraphs(paragraphData, location.insertAfterText, location.nthInsertAfterTextOccurrence);
        expect(result).to.deep.equal({startIndex: -1, endIndex: -1});
    })

    it("returns -1 if the target substring is not found", ()=>{
        const paragraphData = [
            {allText: "This is a test", startIndex: 0, endIndex: 14},
        ];
        const location: InsertTextAction = {
            textToInsert: "Hello, world!",
            insertAfterText: "This is a missing substring",
            nthInsertAfterTextOccurrence: 1,
        }
        const result = findSubstringInParagraphs(paragraphData, location.insertAfterText, location.nthInsertAfterTextOccurrence);
        expect(result).to.deep.equal({startIndex: -1, endIndex: -1});
    })

});