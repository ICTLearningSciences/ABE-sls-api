import OpenAI from "openai";
import { fetchDocTimeline, fetchGoogleDocVersion, storeDocTimeline } from "../../hooks/graphql_api.js";
import { GQLDocumentTimeline, GQLIGDocVersion, GQLTimelinePoint, IGDocVersion, TimelinePointType, TimelineSlice } from "./types.js";
import { DEFAULT_GPT_MODEL } from "../../constants.js";
import { executeOpenAi } from "../../hooks/use-with-open-ai.js";

function isNextTimelinePoint(lastTimelinePoint: IGDocVersion, nextVersion: IGDocVersion): TimelinePointType{
    if(nextVersion.activity !== lastTimelinePoint.activity){
        return TimelinePointType.NEW_ACTIVITY;
    }
    const hasEightHoursPassed = (new Date(nextVersion.createdAt).getTime() - new Date(lastTimelinePoint.createdAt).getTime()) > 8 * 60 * 60 * 1000;
    if(hasEightHoursPassed){
        return TimelinePointType.TIME_DIFFERENCE;
    }
    return TimelinePointType.NONE;
}

function createSlices(versions: IGDocVersion[]): TimelineSlice[] {
    const slices: TimelineSlice[] = [];
    let currentSlice: IGDocVersion[] = [];
    let lastStartSliceReason = TimelinePointType.START;
    // iterate through versions and create slices with isNextTimelinePoint as a boundary
    for (let i = 0; i < versions.length; i++) {
        const currentVersion = versions[i];
        const previousVersion = versions[i - 1];
        if(!previousVersion){
            currentSlice.push(currentVersion);
            continue;
        }

        const nextTimelinePointType = isNextTimelinePoint(previousVersion, currentVersion);
        if (nextTimelinePointType) {
            if (currentSlice.length > 0) {
                slices.push({
                    startReason: lastStartSliceReason,
                    index: i,
                    documents: currentSlice
                });
                lastStartSliceReason = nextTimelinePointType;
            }
            currentSlice = [currentVersion];
        } else {
            currentSlice.push(currentVersion);
        }
    }

    if (currentSlice.length > 0) {
        slices.push({
            startReason: lastStartSliceReason,
            index: versions.length - 1,
            documents: currentSlice
        });
    }

    return slices;
}


async function changeSummaryPromptRequest(lastMajorVersion: GQLIGDocVersion, currentVersion: GQLIGDocVersion){
    const params: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
        messages: [
            {role: "assistant", content: `Previous Version: ${lastMajorVersion.plainText}`},
            {role: "assistant", content: `Current Version: ${currentVersion.plainText}`},
            {role: "system", content: "Provided are two versions of a text document, a previous version and a current version. Please summarize the differences between the two versions. If no changes are present, please indicate that."},
        ],
        model: DEFAULT_GPT_MODEL
    };
    const res = await executeOpenAi(params);
    return res.choices[0].message.content || "";
}

async function reverseOutlinePromptRequest(currentVersion: GQLIGDocVersion){
    const params: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
        messages: [
            {role: "assistant", content: currentVersion.plainText},
            {role: "system", content: `You are a literary and scholarly expert and have been evaluating university-level essays and thesis statements. You have been invited as an evaluation judge of writing, where a detailed and specific evaluation is expected.

            Your task is to generate an outline for this writing. This outline should have a logical inverted pyramid structure. First, identify the most likely thesis statement for that essay. For the thesis statement, I want you to evaluate the claims that made to support the thesis statement. Based on this goal and the format below, list each main point.
            
            {
                “Thesis Statement”: str ,
                // return the most likely thesis statement from the essay
                “Supporting Claims” : [str]
                // List of key claims that are needed to support this thesis 
                “Evidence Given for Each Claim” : [
                 { 
                    "Claim A": str,   // The first primary claim that supports the thesis statement.
                        "Claim A Evidence": [str]  // List of evidence provided for this claim,
                    "Claim B": str,   // The first primary claim that supports the thesis statement.
                        "Claim B Evidence": [str]  // List of evidence provided for this claim,
                }
            }
            You must respond as JSON following the format above. Only respond using valid JSON. The thesis statement, claims, and evidence must all be described in briefly (20 words or less). Please check that the JSON is valid and follows the format given.
            
            The essay you are rating is given below:
            ----------------------------------------------
            `},
        ],
        model: DEFAULT_GPT_MODEL
    };
    const res = await executeOpenAi(params);
    return res.choices[0].message.content || "";
}

export function useWithGetDocumentTimeline(){

    async function getDocumentTimeline(userId: string, docId: string): Promise<GQLDocumentTimeline>{
        const docVersions = await fetchGoogleDocVersion(docId);
        const docTimelineSlices = createSlices(docVersions);
        // console.log("docTimelineSlices")
        // console.log(JSON.stringify(docTimelineSlices, null, 2))
        const timelinePoints: GQLTimelinePoint[] = docTimelineSlices.map(slice => {
            const type = slice.startReason;
            const document = slice.documents[slice.documents.length - 1]; //NOTE: picks last item as document (end of session changes)
            return {
                type,
                document,
                time: document.createdAt,
                intent: '',
                changeSummary: '',
                reverseOutline: '',
                relatedFeedback: ''
            }
        })
        console.log("timelinePoints")
        console.log(JSON.stringify(timelinePoints, null, 2))
        // update changeSummary and reverseOutline for existing timeline points
        const existingDocumentTimeline = await fetchDocTimeline(userId, docId);
        console.log("existingDocumentTimeline")
        console.log(JSON.stringify(existingDocumentTimeline, null, 2))
        if(existingDocumentTimeline){
            existingDocumentTimeline.timelinePoints.forEach(existingTimelinePoint => {
                const matchingTimelinePoint = timelinePoints.find(timelinePoint => timelinePoint.document.docId === existingTimelinePoint.document.docId && timelinePoint.time === existingTimelinePoint.time);
                if(matchingTimelinePoint){
                    matchingTimelinePoint.changeSummary = existingTimelinePoint.changeSummary;
                    matchingTimelinePoint.reverseOutline = existingTimelinePoint.reverseOutline;
                }
            })
        }
        console.log("timelinePoints after merging existingDocumentTimeline")
        console.log(JSON.stringify(timelinePoints, null, 2))
        // Generate summary and reverse outline in parallel for timeline points without these values
        const requests = timelinePoints.map(async (timelinePoint, i) => {
            if(!timelinePoint.changeSummary && i > 0){
                console.log("no change summary", timelinePoint.document.createdAt)
                const previousTimelinePoint = timelinePoints[i - 1];
                timelinePoint.changeSummary = await changeSummaryPromptRequest(previousTimelinePoint.document, timelinePoint.document);
            }
            if(!timelinePoint.reverseOutline){
                console.log("no reverse outline", timelinePoint.document.createdAt)
                timelinePoint.reverseOutline = await reverseOutlinePromptRequest(timelinePoint.document);
            }
        })
        await Promise.all(requests);
        console.log("timelinePoints after openai requests")
        console.log(JSON.stringify(timelinePoints, null, 2))
        const documentTimeline: GQLDocumentTimeline = {
            docId,
            user: userId,
            timelinePoints: timelinePoints
        }
        // console.log("documentTimeline")
        // console.log(JSON.stringify(documentTimeline, null, 2))
        // store timeline in gql



        const res = await storeDocTimeline(documentTimeline);
        // TODO LATER: intention collection
        // TODO LATER: relatedFeedback

        return res
    }


    return{
        getDocumentTimeline
    }
}