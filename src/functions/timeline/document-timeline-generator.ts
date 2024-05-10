/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import {
  fetchDocTimeline,
  fetchGoogleDocVersion,
  storeDocTimeline,
} from '../../hooks/graphql_api.js';
import {
  GQLDocumentTimeline,
  GQLTimelinePoint,
  IGDocVersion,
  AiGenerationStatus,
  TimelinePointType,
  TimelineSlice,
} from './types.js';
import { collectGoogleDocSlicesOutsideOfSessions } from './google-doc-version-handlers.js';
import { drive_v3 } from 'googleapis';
import { reverseOutlinePromptRequest } from './reverse-outline.js';
import { changeSummaryPromptRequest } from './change-summary.js';
import Sentry from '../../sentry-helpers.js';
import { storeDoctimelineDynamoDB } from '../../dynamo-helpers.js';
import { AiAsyncJobStatus } from '../../types.js';
import {
  AiServiceFactory,
  AvailableAiServiceNames,
  AvailableAiServices,
} from '../../ai_services/ai-service-factory.js';

export function isNextTimelinePoint(
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

function sortTimelineSlices(slices: TimelineSlice[]): TimelineSlice[] {
  return slices.sort((a, b) => {
    const aTime = new Date(a.versions[0].createdAt).getTime();
    const bTime = new Date(b.versions[0].createdAt).getTime();
    return aTime - bTime;
  });
}

export async function createSlices(
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
  return sortTimelineSlices([...slices, ...googleDocSlicesOutsideOfSessions]);
}

interface DocTextWithOutline {
  plainText: string;
  reverseOutline: string;
}

function fillInExistingReverseOutlines(
  timelinePoints: GQLTimelinePoint[]
): GQLTimelinePoint[] {
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
  return timelinePoints;
}

function sortDocumentTimelinePoints(timelinePoints: GQLTimelinePoint[]) {
  return timelinePoints.sort((a, b) => {
    const aTime = new Date(a.versionTime).getTime();
    const bTime = new Date(b.versionTime).getTime();
    return aTime - bTime;
  });
}

function mergeExistingTimelinePoints(
  timelinePoints: GQLTimelinePoint[],
  existingTimelinePoints?: GQLTimelinePoint[]
) {
  // TODO: instead of getting the existing document timeline, implement key outline storage.
  if (!existingTimelinePoints || existingTimelinePoints.length === 0) {
    return timelinePoints;
  }
  return timelinePoints.map((timelinePoint, i) => {
    const existingTimelinePoint = existingTimelinePoints[i];
    if (
      existingTimelinePoint.version.docId === timelinePoint.version.docId &&
      existingTimelinePoint.versionTime === timelinePoint.versionTime
    ) {
      return existingTimelinePoint;
    }
    return timelinePoint;
  });
}

export function timelinePointGenerationComplete(
  timelinePoint: GQLTimelinePoint
): boolean {
  return (
    timelinePoint.changeSummaryStatus === AiGenerationStatus.COMPLETED &&
    timelinePoint.reverseOutlineStatus === AiGenerationStatus.COMPLETED
  );
}

/**
 * Checks if the timelinepoint needs its changeSummary or reverseOutline generated
 * @param timelinePoints to check if need generation
 * @returns  a list of timeline points that need generation
 */
export function getTimelinePointsToGenerate(
  timelinePoints: GQLTimelinePoint[]
): GQLTimelinePoint[] {
  const timelinePointsNeedingGenerations = timelinePoints.filter(
    (timelinePoint) => !timelinePointGenerationComplete(timelinePoint)
  );
  if (
    timelinePointsNeedingGenerations.length <=
    NUM_GENERATED_PER_REQUEST * 2
  ) {
    return timelinePointsNeedingGenerations;
  }
  // only generate requests for the first 5 and last 5 timeline points
  return timelinePointsNeedingGenerations
    .slice(0, NUM_GENERATED_PER_REQUEST)
    .concat(
      timelinePointsNeedingGenerations.slice(NUM_GENERATED_PER_REQUEST * -1)
    );
}

export const NUM_GENERATED_PER_REQUEST = 5;

export class DocumentTimelineGenerator {
  aiService: AvailableAiServices;

  constructor(targetAiService: AvailableAiServiceNames) {
    this.aiService = AiServiceFactory.getAiService(targetAiService);
  }

  /**
   * Generates a lsit of change summary OpenAI requests for each timeline point that needs a summary
   * The requests will modify the timeline points in place once the requests are resolved
   */
  generateChangeSummaryRequests(
    timelinePoints: GQLTimelinePoint[]
  ): Promise<void>[] {
    return timelinePoints.map(async (timelinePoint, i) => {
      if (
        timelinePoint.changeSummary &&
        timelinePoint.reverseOutlineStatus === AiGenerationStatus.COMPLETED
      ) {
        return;
      }
      const previousTimelinePoint = i > 0 ? timelinePoints[i - 1] : null;
      if (!previousTimelinePoint) {
        console.log('Change Summary: first version');
        timelinePoint.changeSummary = await changeSummaryPromptRequest(
          '',
          timelinePoint.version.plainText,
          this.aiService
        );
      } else {
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
            timelinePoint.version.plainText,
            this.aiService
          );
        }
      }
      timelinePoint.changeSummaryStatus = AiGenerationStatus.COMPLETED;
    });
  }

  /**
   * Generates a list of reverse outline OpenAI requests for each timeline point that needs once
   * The requests will modify the timeline points in place once the requests are resolved
   */
  generateReverseOutlineRequests(
    timelinePoints: GQLTimelinePoint[]
  ): Promise<void>[] {
    return timelinePoints.map(async (timelinePoint, i) => {
      const previousTimelinePoint = i > 0 ? timelinePoints[i - 1] : null;
      if (
        !timelinePoint.reverseOutline ||
        timelinePoint.reverseOutlineStatus !== AiGenerationStatus.COMPLETED
      ) {
        if (
          previousTimelinePoint?.version.plainText ===
          timelinePoint.version.plainText
        ) {
          console.log('Reverse Outline: no changes from previous version');
          // Will get filled in later from previous timeline point
        } else {
          console.log('Reverse Outline: making request to openai');
          timelinePoint.reverseOutline = await reverseOutlinePromptRequest(
            timelinePoint.version,
            this.aiService
          );
        }
        timelinePoint.reverseOutlineStatus = AiGenerationStatus.COMPLETED;
      }
    });
  }

  async fillSummariesInPlace(
    timelinePoints: GQLTimelinePoint[]
  ): Promise<GQLTimelinePoint[]> {
    // Generate summary and reverse outline in parallel for timeline points without these values
    const changeSummaryRequests =
      this.generateChangeSummaryRequests(timelinePoints);
    const reverseOutlineRequests =
      this.generateReverseOutlineRequests(timelinePoints);
    await Promise.all([...changeSummaryRequests, ...reverseOutlineRequests]);
    timelinePoints = fillInExistingReverseOutlines(timelinePoints);
    return timelinePoints;
  }

  async getDocumentTimeline(
    jobId: string,
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

        reverseOutlineStatus: AiGenerationStatus.IN_PROGRESS,
        changeSummaryStatus: AiGenerationStatus.IN_PROGRESS,
        changeSummary: '',
        reverseOutline: '',

        userInputSummary: '',
        relatedFeedback: '',
        intent: '',
      };
    });
    const existingDocumentTimeline = await fetchDocTimeline(userId, docId);
    timelinePoints = mergeExistingTimelinePoints(
      timelinePoints,
      existingDocumentTimeline?.timelinePoints
    );
    let timelinePointsToGenerate = getTimelinePointsToGenerate(timelinePoints);
    let numLoops = 0;
    const maxLoopsNeeded =
      timelinePoints.length / NUM_GENERATED_PER_REQUEST + 1;
    while (timelinePointsToGenerate.length > 0) {
      if (numLoops > maxLoopsNeeded) {
        throw new Error(
          'Something went wrong generating timeline points. Too many loops.'
        );
      }
      numLoops++;
      // modifies timeline points in place by reference
      await this.fillSummariesInPlace(timelinePointsToGenerate);
      timelinePointsToGenerate = getTimelinePointsToGenerate(timelinePoints);
      if (timelinePointsToGenerate.length > 0) {
        const documentTimeline: GQLDocumentTimeline = {
          docId,
          user: userId,
          timelinePoints: sortDocumentTimelinePoints(timelinePoints),
        };
        await storeDoctimelineDynamoDB(
          jobId,
          documentTimeline,
          AiAsyncJobStatus.IN_PROGRESS
        );
      }
    }
    const documentTimeline: GQLDocumentTimeline = {
      docId,
      user: userId,
      timelinePoints: sortDocumentTimelinePoints(timelinePoints),
    };
    await storeDoctimelineDynamoDB(
      jobId,
      documentTimeline,
      AiAsyncJobStatus.COMPLETE
    );

    // store timeline in gql
    await storeDocTimeline(documentTimeline).catch((e) => {
      Sentry.captureException(e, {
        extra: {
          message: 'Failed to store document timeline',
        },
      });
    });
    return documentTimeline;
  }
}
