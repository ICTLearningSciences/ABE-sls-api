import { assert, expect } from "chai";

import {KeyframeGenerator} from "../../src/functions/timeline/functions/keyframe-generator";
import { AvailableAiServiceNames } from "../../src/ai_services/ai-service-factory";
import { DefaultGptModels } from "../../src/types";
import { documentBigUpdate, documentStart } from "../fixtures/plain-text/doc-with-changes";
import { gqlTimelinePointGenerator } from "../fixtures/documents/helpers/gql-timeline-points-generator";
import { isoStringMinsFromNow } from "../fixtures/documents/helpers/document-generator";
import { TimelinePointType } from "../../src/functions/timeline/functions/types";
import { defaultReverseOutlineRes, mockOpenAiReverseOutlineResponse } from "../helpers";

describe("Keyframe Generator class unit tests", ()=>{
    describe("detect text major change", ()=>{
        describe("false", ()=>{
            it("Current text less than 100 words", ()=>{
                const keyframeGenerator = new KeyframeGenerator([], {
                    serviceName:AvailableAiServiceNames.OPEN_AI,
                    model: DefaultGptModels.OPEN_AI_GPT_3_5
                });
                const previousPlainText = "Less than 100 words";
                const currentPlainText = "Still is less than one hundred words";
                const isMajorChange = keyframeGenerator.textMajorChange(previousPlainText, currentPlainText);
                expect(isMajorChange).to.equal(false);
            })
            
            it("no text change", ()=>{
                const keyframeGenerator = new KeyframeGenerator([], {
                    serviceName:AvailableAiServiceNames.OPEN_AI,
                    model: DefaultGptModels.OPEN_AI_GPT_3_5
                });
    
                const isMajorChange = keyframeGenerator.textMajorChange(documentStart, documentStart);
                expect(isMajorChange).to.equal(false);
            })
        })

        describe("true", ()=>{
            it("Percentage change greater than 20", ()=>{
                const keyframeGenerator = new KeyframeGenerator([], {
                    serviceName:AvailableAiServiceNames.OPEN_AI,
                    model: DefaultGptModels.OPEN_AI_GPT_3_5
                });
                const isMajorChange = keyframeGenerator.textMajorChange(documentStart, documentBigUpdate);
                expect(isMajorChange).to.equal(true);
            })
        })

    })

    describe("Generates Keyframes", ()=>{
        it("For first document with text", async ()=>{
            const docs = gqlTimelinePointGenerator([
                {
                    versionTime: isoStringMinsFromNow(0),
                    type: TimelinePointType.MOST_RECENT,
                    plainText: "",
                    reverseOutline: ""
                },
                {
                    versionTime: isoStringMinsFromNow(1),
                    type: TimelinePointType.NEW_ACTIVITY,
                    plainText: "",
                    reverseOutline: ""
                },
                {
                    versionTime: isoStringMinsFromNow(2),
                    type: TimelinePointType.NEW_ACTIVITY,
                    plainText: documentStart,
                    reverseOutline: ""
                },
            ])
            let numReverseOutlineCalls = {
                calls: 0
            }
            const reverseOutlineNock = mockOpenAiReverseOutlineResponse(defaultReverseOutlineRes, {
                numCallsAccumulator: numReverseOutlineCalls
            })
            const keyframeGenerator = new KeyframeGenerator(docs, {
                serviceName:AvailableAiServiceNames.OPEN_AI,
                model: DefaultGptModels.OPEN_AI_GPT_3_5
            });
            await keyframeGenerator.generateKeyframes();
            assert.equal(reverseOutlineNock.isDone(), true);
            assert(numReverseOutlineCalls.calls === 1)
            assert(keyframeGenerator.keyframes.length === 1)
            assert(keyframeGenerator.keyframes[0].time === docs[2].versionTime)
        })

        it("For subsequent documents with major changes", async ()=>{
            const docs = gqlTimelinePointGenerator([
                {
                    versionTime: isoStringMinsFromNow(0),
                    type: TimelinePointType.MOST_RECENT,
                    plainText: documentStart,
                    reverseOutline: ""
                },
                {
                    versionTime: isoStringMinsFromNow(1),
                    type: TimelinePointType.NEW_ACTIVITY,
                    plainText: documentStart,
                    reverseOutline: ""
                },
                {
                    versionTime: isoStringMinsFromNow(2),
                    type: TimelinePointType.NEW_ACTIVITY,
                    plainText: documentStart,
                    reverseOutline: ""
                },
                {
                    versionTime: isoStringMinsFromNow(3),
                    type: TimelinePointType.MOST_RECENT,
                    plainText: documentBigUpdate,
                    reverseOutline: ""
                }
            ])
            let numReverseOutlineCalls = {
                calls: 0
            }
            const reverseOutlineNock = mockOpenAiReverseOutlineResponse(defaultReverseOutlineRes, {
                numCallsAccumulator: numReverseOutlineCalls,
                interceptAllCalls: true
            
            })
            const keyframeGenerator = new KeyframeGenerator(docs, {
                serviceName:AvailableAiServiceNames.OPEN_AI,
                model: DefaultGptModels.OPEN_AI_GPT_3_5
            });
            await keyframeGenerator.generateKeyframes();
            assert.equal(reverseOutlineNock.isDone(), true);
            assert(numReverseOutlineCalls.calls === 2)
            assert(keyframeGenerator.keyframes.length === 2)
            assert(keyframeGenerator.keyframes[0].time === docs[0].versionTime)
            assert(keyframeGenerator.keyframes[1].time === docs[3].versionTime)
        })

        it("uses pre-existing reverse outline if available", async ()=>{
            const docs = gqlTimelinePointGenerator([
                {
                    versionTime: isoStringMinsFromNow(0),
                    type: TimelinePointType.MOST_RECENT,
                    plainText: "",
                    reverseOutline: ""
                },
                {
                    versionTime: isoStringMinsFromNow(1),
                    type: TimelinePointType.NEW_ACTIVITY,
                    plainText: "",
                    reverseOutline: ""
                },
                {
                    versionTime: isoStringMinsFromNow(2),
                    type: TimelinePointType.NEW_ACTIVITY,
                    plainText: documentStart,
                    reverseOutline: "hello, world!"
                },
            ])
            let numReverseOutlineCalls = {
                calls: 0
            }
            mockOpenAiReverseOutlineResponse(defaultReverseOutlineRes, {
                numCallsAccumulator: numReverseOutlineCalls
            })
            const keyframeGenerator = new KeyframeGenerator(docs, {
                serviceName:AvailableAiServiceNames.OPEN_AI,
                model: DefaultGptModels.OPEN_AI_GPT_3_5
            });
            await keyframeGenerator.generateKeyframes();
            assert(numReverseOutlineCalls.calls === 0)
            assert(keyframeGenerator.keyframes.length === 1)
            assert(keyframeGenerator.keyframes[0].time === docs[2].versionTime)
            assert(keyframeGenerator.keyframes[0].reverseOutline === docs[2].reverseOutline)
        })
    })

    describe("getting keyframes for a timeline point", ()=>{

        it("if no keyframes, returns empty string", ()=>{
            const keyframeGenerator = new KeyframeGenerator([], {
                serviceName:AvailableAiServiceNames.OPEN_AI,
                model: DefaultGptModels.OPEN_AI_GPT_3_5
            });
            keyframeGenerator.keyframes = [];

            const keyframe = keyframeGenerator.getKeyFrameForTime(isoStringMinsFromNow(0))
            expect(keyframe).to.equal("")
        })

        it("returns keyframe that comes just before the timeline point", ()=>{
            const keyframeGenerator = new KeyframeGenerator([], {
                serviceName:AvailableAiServiceNames.OPEN_AI,
                model: DefaultGptModels.OPEN_AI_GPT_3_5
            });
            keyframeGenerator.keyframes = [
                {
                    time: isoStringMinsFromNow(0),
                    reverseOutline: "keyframe 1"
                },
                {
                    time: isoStringMinsFromNow(5),
                    reverseOutline: "keyframe 2"
                },
                {
                    time: isoStringMinsFromNow(10),
                    reverseOutline: "keyframe 3"
                }
            ]
            const keyframe1 = keyframeGenerator.getKeyFrameForTime(isoStringMinsFromNow(0))
            expect(keyframe1).to.equal("keyframe 1")
            const keyframe2 = keyframeGenerator.getKeyFrameForTime(isoStringMinsFromNow(7))
            expect(keyframe2).to.equal("keyframe 2")
            const keyframe3 = keyframeGenerator.getKeyFrameForTime(isoStringMinsFromNow(10))
            expect(keyframe3).to.equal("keyframe 3")
            const keyframe4 = keyframeGenerator.getKeyFrameForTime(isoStringMinsFromNow(25))
            expect(keyframe4).to.equal("keyframe 3")
        })
    })
})