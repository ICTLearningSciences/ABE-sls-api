import { assert, expect } from "chai";

import {KeyframeGenerator} from "../../src/functions/timeline/functions/keyframe-generator";
import { AvailableAiServiceNames } from "../../src/ai_services/ai-service-factory";
import { DefaultGptModels } from "../../src/types";
import { documentBigUpdate, documentStart } from "../fixtures/plain-text/doc-with-changes";
import { gqlTimelinePointGenerator } from "../fixtures/documents/helpers/gql-timeline-points-generator";
import { gqlDocVersionGenerator, isoStringMinsFromNow } from "../fixtures/documents/helpers/document-generator";
import { IGDocVersion, TimelinePointType } from "../../src/functions/timeline/functions/types";
import { assertRequestIncludesMessage, defaultChangeSummaryRes, defaultReverseOutlineRes, mockGraphqlQuery, mockOpenAiCall, mockOpenAiChangeSummaryResponse, mockOpenAiReverseOutlineResponse } from "../helpers";
import { DocumentTimelineGenerator } from "../../src/functions/timeline/functions/document-timeline-generator";
import { docTimeline } from "../fixtures/documents/2-sessions-inbetween-outside-ABE/doc-timeline";
import { GoogleDocService } from "../../src/doc_services/google-doc-services";

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
            const [reverseOutlineNock, reverseOutlineNockRequestData] = mockOpenAiReverseOutlineResponse(defaultReverseOutlineRes)
            const keyframeGenerator = new KeyframeGenerator(docs, {
                serviceName:AvailableAiServiceNames.OPEN_AI,
                model: DefaultGptModels.OPEN_AI_GPT_3_5
            });
            await keyframeGenerator.generateKeyframes();
            assert.equal(reverseOutlineNock.isDone(), true);
            assert(reverseOutlineNockRequestData.calls === 1)
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
            const [reverseOutlineNock, reverseOutlineNockRequestData] = mockOpenAiReverseOutlineResponse(defaultReverseOutlineRes, {
                interceptAllCalls: true
            
            })
            const keyframeGenerator = new KeyframeGenerator(docs, {
                serviceName:AvailableAiServiceNames.OPEN_AI,
                model: DefaultGptModels.OPEN_AI_GPT_3_5
            });
            await keyframeGenerator.generateKeyframes();
            assert.equal(reverseOutlineNock.isDone(), true);
            assert(reverseOutlineNockRequestData.calls === 2)
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

            const [_, openAiReverseOutlineRequestData] = mockOpenAiReverseOutlineResponse(defaultReverseOutlineRes)
            const keyframeGenerator = new KeyframeGenerator(docs, {
                serviceName:AvailableAiServiceNames.OPEN_AI,
                model: DefaultGptModels.OPEN_AI_GPT_3_5
            });
            await keyframeGenerator.generateKeyframes();
            assert(openAiReverseOutlineRequestData.calls === 0)
            assert(keyframeGenerator.keyframes.length === 1)
            assert(keyframeGenerator.keyframes[0].time === docs[2].versionTime)
            assert(keyframeGenerator.keyframes[0].reverseOutline === docs[2].reverseOutline)
        })
    })

    describe("getting keyframes for a timeline point", ()=>{

        it("if no keyframes, returns undefined", ()=>{
            const keyframeGenerator = new KeyframeGenerator([], {
                serviceName:AvailableAiServiceNames.OPEN_AI,
                model: DefaultGptModels.OPEN_AI_GPT_3_5
            });
            keyframeGenerator.keyframes = [];

            const keyframe = keyframeGenerator.getKeyFrameForTime(isoStringMinsFromNow(0))
            expect(keyframe).to.equal(undefined)
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
            expect(keyframe1?.reverseOutline).to.equal("keyframe 1")
            const keyframe2 = keyframeGenerator.getKeyFrameForTime(isoStringMinsFromNow(7))
            expect(keyframe2?.reverseOutline).to.equal("keyframe 2")
            const keyframe3 = keyframeGenerator.getKeyFrameForTime(isoStringMinsFromNow(10))
            expect(keyframe3?.reverseOutline).to.equal("keyframe 3")
            const keyframe4 = keyframeGenerator.getKeyFrameForTime(isoStringMinsFromNow(25))
            expect(keyframe4?.reverseOutline).to.equal("keyframe 3")
        })
    })

    describe("generates keyframes for document timeline", ()=>{
        it("one keyframe", async ()=>{
            const gdocVersions: IGDocVersion[] = gqlDocVersionGenerator([
                {activity: "0", plainText: documentStart, createdAt: isoStringMinsFromNow(1)},
                {activity: "1", plainText: `${documentStart} test 1`, createdAt: isoStringMinsFromNow(2)},
                {activity: "2", plainText: `${documentStart} test 2`, createdAt: isoStringMinsFromNow(3)},
                {activity: "3", plainText: `${documentStart} test 3`, createdAt: isoStringMinsFromNow(4)},
                {activity: "4", plainText: `${documentStart} test 4`, createdAt: isoStringMinsFromNow(5)},
                {activity: "5", plainText: `${documentStart} test 5`, createdAt: isoStringMinsFromNow(6)},
              ])
              mockGraphqlQuery("FetchDocTimeline", {
                "fetchDocTimeline": undefined
              });
              mockGraphqlQuery("FetchGoogleDocVersions", {
                "fetchGoogleDocVersions": gdocVersions
              });
              mockGraphqlQuery("StoreDocTimeline", {
                "storeDocTimeline": docTimeline
              })
              mockOpenAiChangeSummaryResponse(
                defaultChangeSummaryRes,
                {
                  interceptAllCalls: true
                }
              )
              const firstKeyframe = {
                ...defaultReverseOutlineRes,
                "Thesis Statement": "first keyframe"
              }
              const [keyframeOneGeneration, keyframeOneRequestData] = mockOpenAiReverseOutlineResponse(
                firstKeyframe
              )

              const [_, firstReqData] = mockOpenAiReverseOutlineResponse(
                    {
                        ...defaultReverseOutlineRes,
                        "Thesis Statement": "test 1 with first keyframe"
                    },
                );

                const [__, secondReqData] = mockOpenAiReverseOutlineResponse(
                    {
                        ...defaultReverseOutlineRes,
                        "Thesis Statement": "test 2 with first keyframe"
                    },
                );

                const [___, thirdReqData] =mockOpenAiReverseOutlineResponse(
                    {
                        ...defaultReverseOutlineRes,
                        "Thesis Statement": "test 3 with first keyframe"
                    },
                );

                const [____, fourthReqData] =mockOpenAiReverseOutlineResponse(
                    {
                        ...defaultReverseOutlineRes,
                        "Thesis Statement": "test 4 with first keyframe"
                    },
                );

                const [_____, fifthReqData] =mockOpenAiReverseOutlineResponse(
                    {
                        ...defaultReverseOutlineRes,
                        "Thesis Statement": "test 5 with first keyframe"
                    },
                );


                const docTimelineGenerator = new DocumentTimelineGenerator({
                    serviceName:AvailableAiServiceNames.OPEN_AI,
                    model: DefaultGptModels.OPEN_AI_GPT_3_5
                  })
    
                const res = await docTimelineGenerator.getDocumentTimeline("","fake-user", "fake-doc", [], new GoogleDocService({}))
    
                assert(keyframeOneGeneration.isDone() === true)
                assert(keyframeOneRequestData.calls === 1)

                assert(res.timelinePoints[0].reverseOutline ===  JSON.stringify(firstKeyframe))

                assertRequestIncludesMessage("Use this previous reverse outline", firstReqData.requestBodies[0].messages)
                assertRequestIncludesMessage("first keyframe", firstReqData.requestBodies[0].messages)
                assertRequestIncludesMessage("Use this previous reverse outline", secondReqData.requestBodies[0].messages)
                assertRequestIncludesMessage("first keyframe", secondReqData.requestBodies[0].messages)
                assertRequestIncludesMessage("Use this previous reverse outline", thirdReqData.requestBodies[0].messages)
                assertRequestIncludesMessage("first keyframe", thirdReqData.requestBodies[0].messages)
                assertRequestIncludesMessage("Use this previous reverse outline", fourthReqData.requestBodies[0].messages)
                assertRequestIncludesMessage("first keyframe", fourthReqData.requestBodies[0].messages)
                assertRequestIncludesMessage("Use this previous reverse outline", fifthReqData.requestBodies[0].messages)
                assertRequestIncludesMessage("first keyframe", fifthReqData.requestBodies[0].messages)
            
        })

        it("with 2 major text changes", async ()=>{
            const gdocVersions: IGDocVersion[] = gqlDocVersionGenerator([
                {activity: "0", plainText: documentStart, createdAt: isoStringMinsFromNow(1)},
                {activity: "1", plainText: `${documentStart} test 1`, createdAt: isoStringMinsFromNow(2)},
                {activity: "2", plainText: `${documentStart} test 2`, createdAt: isoStringMinsFromNow(3)},
                {activity: "9", plainText: documentBigUpdate, createdAt: isoStringMinsFromNow(10)},
                {activity: "15", plainText: `${documentBigUpdate} test 3`, createdAt: isoStringMinsFromNow(16)},
                {activity: "20", plainText: `${documentBigUpdate} test 4`, createdAt: isoStringMinsFromNow(21)},
                {activity: "25", plainText: documentStart, createdAt: isoStringMinsFromNow(26)},
              ])
              mockGraphqlQuery("FetchDocTimeline", {
                "fetchDocTimeline": undefined
              });
              mockGraphqlQuery("FetchGoogleDocVersions", {
                "fetchGoogleDocVersions": gdocVersions
              });
              mockGraphqlQuery("StoreDocTimeline", {
                "storeDocTimeline": docTimeline
              })
              mockOpenAiChangeSummaryResponse(
                defaultChangeSummaryRes,
                {
                  interceptAllCalls: true
                }
              )
            
              const firstKeyframe = {
                ...defaultReverseOutlineRes,
                "Thesis Statement": "first keyframe"
              }
              const [keyframeOneGeneration, keyframeOneRequestData] = mockOpenAiReverseOutlineResponse(
                firstKeyframe
              )
              const secondKeyframe = {
                ...defaultReverseOutlineRes,
                "Thesis Statement": "second keyframe"
              }
              const [keyframeTwoGeneration, keyframeTwoRequestData] = mockOpenAiReverseOutlineResponse(
                secondKeyframe
              )
              const thirdKeyframe = {
                ...defaultReverseOutlineRes,
                "Thesis Statement": "third keyframe"
              }
              const [keyframeThreeGeneration, keyframeThreeRequestData] = mockOpenAiReverseOutlineResponse(
                thirdKeyframe
              )

              const [reverseOutlineNock1, reverseOutlineNock1RequestData] = mockOpenAiReverseOutlineResponse(
                {
                    ...defaultReverseOutlineRes,
                    "Thesis Statement": "test 1 with first keyframe"
                }
              )
              const [reverseOutlineNock2, reverseOutlineNock2RequestData] = mockOpenAiReverseOutlineResponse(
                {
                    ...defaultReverseOutlineRes,
                    "Thesis Statement": "test 2 with first keyframe"
                },
              )
                const [reverseOutlineNock3, reverseOutlineNock3RequestData] = mockOpenAiReverseOutlineResponse(
                    {
                        ...defaultReverseOutlineRes,
                        "Thesis Statement": "test 3 with second keyframe"
                    }
                )
                const [reverseOutlineNock4, reverseOutlineNock4RequestData] = mockOpenAiReverseOutlineResponse(
                    {
                        ...defaultReverseOutlineRes,
                        "Thesis Statement": "test 4 with second keyframe"
                    }
                )

              const docTimelineGenerator = new DocumentTimelineGenerator({
                serviceName:AvailableAiServiceNames.OPEN_AI,
                model: DefaultGptModels.OPEN_AI_GPT_3_5
              })

            const res = await docTimelineGenerator.getDocumentTimeline("","fake-user", "fake-doc", [], "fake-key")


            assert(keyframeOneGeneration.isDone() === true)
            assert(keyframeTwoGeneration.isDone() === true)
            assert(keyframeThreeGeneration.isDone() === true)
            assert(reverseOutlineNock1.isDone() === true)
            assert(reverseOutlineNock2.isDone() === true)
            assert(reverseOutlineNock3.isDone() === true)
            assert(reverseOutlineNock4.isDone() === true)
            assert(keyframeOneRequestData.calls === 1)
            assert(keyframeTwoRequestData.calls === 1)
            assert(keyframeThreeRequestData.calls === 1)
            assert(reverseOutlineNock1RequestData.calls === 1)
            assert(reverseOutlineNock2RequestData.calls === 1)
            assert(reverseOutlineNock3RequestData.calls === 1)
            assert(reverseOutlineNock4RequestData.calls === 1)

            // docs with major changes get keyframes generated and should use those keyframes as their reverse outlines
            assert(res.timelinePoints[0].reverseOutline ===  JSON.stringify(firstKeyframe))
            assert(res.timelinePoints[3].reverseOutline ===  JSON.stringify(secondKeyframe))
            assert(res.timelinePoints[6].reverseOutline ===  JSON.stringify(thirdKeyframe))

            // docs without major changes should utilize the keyframes generated from the major changes
            // check that their requests included the keyframes
            assertRequestIncludesMessage("Use this previous reverse outline", reverseOutlineNock1RequestData.requestBodies[0].messages)
            assertRequestIncludesMessage("first keyframe", reverseOutlineNock1RequestData.requestBodies[0].messages)
            
            assertRequestIncludesMessage("Use this previous reverse outline", reverseOutlineNock2RequestData.requestBodies[0].messages)
            assertRequestIncludesMessage("first keyframe", reverseOutlineNock2RequestData.requestBodies[0].messages)

            assertRequestIncludesMessage("Use this previous reverse outline", reverseOutlineNock3RequestData.requestBodies[0].messages)
            assertRequestIncludesMessage("second keyframe", reverseOutlineNock3RequestData.requestBodies[0].messages)

            assertRequestIncludesMessage("Use this previous reverse outline", reverseOutlineNock4RequestData.requestBodies[0].messages)
            assertRequestIncludesMessage("second keyframe", reverseOutlineNock4RequestData.requestBodies[0].messages)
            
        })
    })
})