/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import OpenAI from 'openai';
import {
  fetchDocTimeline,
  fetchGoogleDocVersion,
  storeDocTimeline,
} from '../../hooks/graphql_api.js';
import {
  GQLDocumentTimeline,
  GQLIGDocVersion,
  GQLTimelinePoint,
  IGDocVersion,
  TimelinePointType,
  TimelineSlice,
} from './types.js';
import { DEFAULT_GPT_MODEL } from '../../constants.js';
import { executeOpenAi } from '../../hooks/use-with-open-ai.js';
import { GoogleDocVersion } from '../../hooks/google_api.js';
import { collectGoogleDocSlicesOutsideOfSessions } from './google-doc-version-handlers.js';
import { drive_v3 } from 'googleapis';

function isNextTimelinePoint(
  lastTimelinePoint: IGDocVersion,
  nextVersion: IGDocVersion
): TimelinePointType {
  if (
    nextVersion.activity !== lastTimelinePoint.activity ||
    nextVersion.sessionId !== lastTimelinePoint.sessionId
  ) {
    return TimelinePointType.NEW_ACTIVITY;
  }
  const hasEightHoursPassed =
    new Date(nextVersion.createdAt).getTime() -
      new Date(lastTimelinePoint.createdAt).getTime() >
    8 * 60 * 60 * 1000;
  if (hasEightHoursPassed) {
    return TimelinePointType.TIME_DIFFERENCE;
  }
  return TimelinePointType.NONE;
}

async function createSlices(
  versions: IGDocVersion[],
  externalGoogleDocRevisions: drive_v3.Schema$Revision[],
  googleAccessToken: string
): Promise<TimelineSlice[]> {
  const slices: TimelineSlice[] = [];
  let currentSlice: IGDocVersion[] = [];
  let lastStartSliceReason = TimelinePointType.START;
  // iterate through versions and create slices with isNextTimelinePoint as a boundary
  for (let i = 0; i < versions.length; i++) {
    const currentVersion = versions[i];
    const previousVersion = versions[i - 1];
    if (!previousVersion) {
      currentSlice.push(currentVersion);
      continue;
    }

    const nextTimelinePointType = isNextTimelinePoint(
      previousVersion,
      currentVersion
    );
    if (nextTimelinePointType) {
      if (currentSlice.length > 0) {
        slices.push({
          startReason: lastStartSliceReason,
          versions: currentSlice,
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
      versions: currentSlice,
    });
  }

  const googleDocSlicesOutsideOfSessions =
    await collectGoogleDocSlicesOutsideOfSessions(
      slices,
      externalGoogleDocRevisions,
      googleAccessToken
    );
  return [...slices, ...googleDocSlicesOutsideOfSessions];
}

async function changeSummaryPromptRequest(
  lastVersionText: string,
  currentVersionText: string
) {
  const isCurrentVersionFirstVersion = !lastVersionText;

  const compareVersionsParams: OpenAI.Chat.Completions.ChatCompletionCreateParams =
    {
      messages: [
        {
          role: 'assistant',
          content: `Previous Version: ${lastVersionText}`,
        },
        {
          role: 'assistant',
          content: `Current Version: ${currentVersionText}`,
        },
        {
          role: 'system',
          content: `Provided are two versions of a text document, a previous version and a current version.
            Please summarize the differences between the two versions in 1 to 3 sentences.
            The first sentence should give a clear statement on biggest changes and the scope of the changes such as major additions / deletions, major revisions, minor changes. The second and third sentences should clearly refer to what specific areas of the document changed substantially, with more specifics about what changed.
            The second and third sentences are optional and are not needed if only minor changes were made.
            `,
        },
      ],
      model: DEFAULT_GPT_MODEL,
    };

  const summarizeVersionParams: OpenAI.Chat.Completions.ChatCompletionCreateParams =
    {
      messages: [
        {
          role: 'assistant',
          content: `Here is the essay: ${currentVersionText}`,
        },
        {
          role: 'system',
          content: `Please summarize the essay in 3 sentences.
            `,
        },
      ],
      model: DEFAULT_GPT_MODEL,
    };

  const res = await executeOpenAi(
    isCurrentVersionFirstVersion
      ? summarizeVersionParams
      : compareVersionsParams
  );
  return res.choices[0].message.content || '';
}

async function reverseOutlinePromptRequest(currentVersion: GQLIGDocVersion) {
  const params: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
    messages: [
      { role: 'assistant', content: currentVersion.plainText },
      {
        role: 'system',
        content: `You are a literary and scholarly expert and have been evaluating university-level essays and thesis statements. You have been invited as an evaluation judge of writing, where a detailed and specific evaluation is expected.

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
            `,
      },
    ],
    model: DEFAULT_GPT_MODEL,
  };
  const res = await executeOpenAi(params);
  return res.choices[0].message.content || '';
}

interface DocTextWithOutline {
  plainText: string;
  reverseOutline: string;
}

function fillInReverseOutlines(timelinePoints: GQLTimelinePoint[]) {
  const docTextOutlines: DocTextWithOutline[] = timelinePoints.map(
    (timelinePoint) => {
      return {
        plainText: timelinePoint.version.plainText,
        reverseOutline: timelinePoint.reverseOutline,
      };
    }
  );
  timelinePoints.forEach((timelinePoint, i) => {
    if (!timelinePoint.reverseOutline) {
      const existingTextOutline = docTextOutlines.find(
        (docTextOutline) =>
          docTextOutline.plainText === timelinePoint.version.plainText
      );
      if (existingTextOutline) {
        timelinePoint.reverseOutline = existingTextOutline.reverseOutline;
      }
    }
  });
}

function sortDocumentTimelinePoints(timelinePoints: GQLTimelinePoint[]) {
  return timelinePoints.sort((a, b) => {
    const aTime = new Date(a.versionTime).getTime();
    const bTime = new Date(b.versionTime).getTime();
    return aTime - bTime;
  });
}

export function useWithGetDocumentTimeline() {
  async function getDocumentTimeline(
    userId: string,
    docId: string,
    externalGoogleDocRevisions: drive_v3.Schema$Revision[],
    googleAccessToken: string
  ): Promise<GQLDocumentTimeline> {
    const docVersions = await fetchGoogleDocVersion(docId);
    const docTimelineSlices = await createSlices(
      docVersions,
      externalGoogleDocRevisions,
      googleAccessToken
    );
    let timelinePoints: GQLTimelinePoint[] = docTimelineSlices.map((slice) => {
      const type = slice.startReason;
      const version = slice.versions[slice.versions.length - 1]; //NOTE: picks last item as version (end of session changes)
      return {
        type,
        version,
        versionTime: version.createdAt,
        intent: '',
        changeSummary: '',
        userInputSummary: '',
        reverseOutline: '',
        relatedFeedback: '',
      };
    });
    // TODO: instead of getting the existing document timeline, check key outline storage.
    const existingDocumentTimeline = await fetchDocTimeline(userId, docId);
    if (existingDocumentTimeline) {
      existingDocumentTimeline.timelinePoints.forEach(
        (existingTimelinePoint) => {
          let matchingTimelinePointIndex = timelinePoints.findIndex(
            (timelinePoint) =>
              timelinePoint.version.docId ===
                existingTimelinePoint.version.docId &&
              timelinePoint.versionTime === existingTimelinePoint.versionTime
          );
          if (matchingTimelinePointIndex !== -1) {
            timelinePoints[matchingTimelinePointIndex] = existingTimelinePoint;
          }
        }
      );
    }
    // Generate summary and reverse outline in parallel for timeline points without these values
    const changeSummaryRequests = timelinePoints.map(
      async (timelinePoint, i) => {
        const previousTimelinePoint = i > 0 ? timelinePoints[i - 1] : null;
        if (!timelinePoint.changeSummary && !previousTimelinePoint) {
          timelinePoint.changeSummary = await changeSummaryPromptRequest(
            '',
            timelinePoint.version.plainText
          );
        }
        if (!timelinePoint.changeSummary && previousTimelinePoint) {
          if (
            previousTimelinePoint?.version.plainText ===
            timelinePoint.version.plainText
          ) {
            console.log('Change Summary: no changes from previous version');
            timelinePoint.changeSummary = 'No changes from previous version';
          } else {
            console.log('Change Summary: making request to openai');
            timelinePoint.changeSummary = await changeSummaryPromptRequest(
              previousTimelinePoint.version.plainText,
              timelinePoint.version.plainText
            );
          }
        }
      }
    );
    const reverseOutlineRequests = timelinePoints.map(
      async (timelinePoint, i) => {
        const previousTimelinePoint = i > 0 ? timelinePoints[i - 1] : null;
        if (!timelinePoint.reverseOutline) {
          if (
            previousTimelinePoint?.version.plainText ===
            timelinePoint.version.plainText
          ) {
            console.log('Reverse Outline: no changes from previous version');
            // Will get filled in later from previous timeline point
          } else {
            console.log('Reverse Outline: making request to openai');
            timelinePoint.reverseOutline = await reverseOutlinePromptRequest(
              timelinePoint.version
            );
          }
        }
      }
    );
    await Promise.all([...changeSummaryRequests, ...reverseOutlineRequests]);
    fillInReverseOutlines(timelinePoints);

    const documentTimeline: GQLDocumentTimeline = {
      docId,
      user: userId,
      timelinePoints: sortDocumentTimelinePoints(timelinePoints),
    };
    // store timeline in gql

    const res = await storeDocTimeline(documentTimeline);
    // TODO LATER: relatedFeedback
    return res;
  }

  return {
    getDocumentTimeline,
  };
}
