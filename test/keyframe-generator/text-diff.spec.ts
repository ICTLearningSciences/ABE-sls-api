import { expect } from "chai";
import { numberChangesUsingDiffWords, percentageChangeUsingDiffWords } from "../../src/helpers";
import { documentFewUpdates, documentNewWhitespace, documentStart } from "../fixtures/plain-text/doc-with-changes";


describe("Text diff checker unit tests", ()=>{
    describe("percent changed", ()=>{
        it("no text change", ()=>{
            const previousPlainText = "This is a test";
            const currentPlainText = "This is a test";
            const diffPercentage = percentageChangeUsingDiffWords(previousPlainText, currentPlainText);
            expect(diffPercentage).to.equal(0);
        })
    
        it("word added", ()=>{
            const previousPlainText = "one two three";
            const currentPlainText = "one two three four";
            const diffPercentage = percentageChangeUsingDiffWords(previousPlainText, currentPlainText);
            expect(Math.floor(diffPercentage)).to.equal(40);
        })
    
        it("word removed", ()=>{
            const previousPlainText = "one two three";
            const currentPlainText = "one two";
            const diffPercentage = percentageChangeUsingDiffWords(previousPlainText, currentPlainText);
            expect(Math.floor(diffPercentage)).to.equal(50);
        })
    
        it("ignore white spaces", ()=>{
            const diffPercentage = percentageChangeUsingDiffWords(documentStart, documentNewWhitespace);
            expect(diffPercentage).to.equal(0);
        })
    
        it("small update", ()=>{
            const diffPercentage = percentageChangeUsingDiffWords(documentStart, documentFewUpdates);
            expect(Math.floor(diffPercentage)).to.equal(5);
        })
    
    })

    describe("number of changes", ()=>{
        it("no text change", ()=>{
            const previousPlainText = "This is a test";
            const currentPlainText = "This is a test";
            const numWordChanges = numberChangesUsingDiffWords(previousPlainText, currentPlainText);
            expect(numWordChanges).to.equal(0);
        })
    
        it("word added", ()=>{
            const previousPlainText = "one two three";
            const currentPlainText = "one two three four";
            const numWordChanges = numberChangesUsingDiffWords(previousPlainText, currentPlainText);
            expect(numWordChanges).to.equal(1);
        })
    
        it("word removed", ()=>{
            const previousPlainText = "one two three";
            const currentPlainText = "one two";
            const numWordChanges = numberChangesUsingDiffWords(previousPlainText, currentPlainText);
            expect(numWordChanges).to.equal(1);
        })
    
        it("ignore white spaces", ()=>{
            const numWordChanges = numberChangesUsingDiffWords(documentStart, documentNewWhitespace);
            expect(numWordChanges).to.equal(0);
        })

        it("words removed and added", ()=>{
            const previousPlainText = "one two three four five six.";
            const currentPlainText = "one two three five six seven.";
            const numWordChanges = numberChangesUsingDiffWords(previousPlainText, currentPlainText);
            expect(numWordChanges).to.equal(2);
        })
    })
})