/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { IGDocVersion, TimelineSlice, TimelinePointType } from './types.js';
import { DocService } from 'doc_services/abstract-doc-service.js';

interface VersionBoundaries {
  startOfNewSlice: IGDocVersion;
  endOfLastSlice: IGDocVersion;
}

/**
 * 
    Picking algorithm:
    Look for existing slices where there is a text difference between the slices end version and the next slices start version,
        this means the doc was edited outside of ABE
    Collect google doc version between those 2 timestamps, and create a slice out of that.
 */
export async function collectGoogleDocSlicesOutsideOfSessions(
  currentSlices: TimelineSlice[],
  externalDocVersions: any[],
  docService: DocService<any>
): Promise<TimelineSlice[]> {
  if (!currentSlices.length) {
    console.log('No current slices');
    return [];
  }
  const newSlices: TimelineSlice[] = [];

  // First, get edits made in google doc after the last slice (modified outside of ABE and didn't come back)
  const lastSlice = currentSlices[currentSlices.length - 1];
  const lastSliceEndVersion = lastSlice.versions[lastSlice.versions.length - 1];
  const externalDocVersionsAfterLastSlice = externalDocVersions.filter(
    (externalDocVersion) => {
      if (!externalDocVersion.modifiedTime) {
        console.error('No modified time found for google doc revision');
        return false;
      }
      const modifiedTime = new Date(externalDocVersion.modifiedTime).getTime();
      const lastSliceEndVersionTime = new Date(
        lastSliceEndVersion.createdAt
      ).getTime();
      return modifiedTime > lastSliceEndVersionTime;
    }
  );
  if (externalDocVersionsAfterLastSlice.length > 0) {
    const docVersions: IGDocVersion[] =
      await docService.convertExternalDocVersionsToIGDocVersion(
        externalDocVersionsAfterLastSlice,
        lastSliceEndVersion
      );
    newSlices.push({
      startReason: TimelinePointType.EDITED_OUTSIDE_OF_ABE,
      versions: docVersions,
    });
  }

  // look for slices where there is a text difference between the slices end version and the next slices start version,
  //  and creating an array of start points and end points to collect google doc versions between those timestamps
  const versionBoundaries: VersionBoundaries[] = [];
  for (let i = 0; i < currentSlices.length - 1; i++) {
    const currentSlice = currentSlices[i];
    const nextSlice = currentSlices[i + 1];
    const endVersion = currentSlice.versions[currentSlice.versions.length - 1];
    const startVersion = nextSlice.versions[0];
    if (endVersion.plainText !== startVersion.plainText) {
      versionBoundaries.push({
        endOfLastSlice: endVersion,
        startOfNewSlice: startVersion,
      });
    }
  }
  // collect google doc versions between the timestamps, and create slices out of them
  for (const versionBoundary of versionBoundaries) {
    const externalRevisionsWithintimestamp = externalDocVersions.filter(
      (externalRevision) => {
        if (!externalRevision.modifiedTime) {
          console.error('No modified time found for google doc revision');
          return false;
        }
        const modifiedTime = new Date(externalRevision.modifiedTime).getTime();
        const endOfLastSliceTime = new Date(
          versionBoundary.endOfLastSlice.createdAt
        ).getTime();
        const startOfNewSliceTime = new Date(
          versionBoundary.startOfNewSlice.createdAt
        ).getTime();
        return (
          modifiedTime > endOfLastSliceTime &&
          modifiedTime < startOfNewSliceTime
        );
      }
    );
    if (externalRevisionsWithintimestamp.length > 0) {
      const googleDocVersionsWithinTimestamps: IGDocVersion[] =
        await docService.convertExternalDocVersionsToIGDocVersion(
          externalRevisionsWithintimestamp,
          versionBoundary.endOfLastSlice
        );
      newSlices.push({
        startReason: TimelinePointType.EDITED_OUTSIDE_OF_ABE,
        versions: googleDocVersionsWithinTimestamps,
      });
    }
  }
  return newSlices;
}
