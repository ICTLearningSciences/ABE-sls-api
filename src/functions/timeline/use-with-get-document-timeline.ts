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
  TimelinePointType,
  TimelineSlice,
} from './types.js';
import { collectGoogleDocSlicesOutsideOfSessions } from './google-doc-version-handlers.js';
import { drive_v3 } from 'googleapis';
import { reverseOutlinePromptRequest } from './reverse-outline.js';
import { changeSummaryPromptRequest } from './change-summary.js';

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
