import { GoogleDocVersion } from "../../hooks/google_api.js";
import { IGDocVersion, TimelineSlice, TimelinePointType } from "./types.js";

interface VersionBoundaries{
    startOfNewSlice: IGDocVersion;
    endOfLastSlice: IGDocVersion;
}

function convertGoogleDocVersionToIGdocVersion(googleDocVersion: GoogleDocVersion, lastRealVersion: IGDocVersion): IGDocVersion{
    return {
        docId: googleDocVersion.id,
        plainText: googleDocVersion.rawText,
        lastChangedId:  "",
        documentIntention: lastRealVersion.documentIntention,
        dayIntention: lastRealVersion.dayIntention,
        sessionId: "",
        chatLog: [],
        activity: "",
        intent: '',
        title: lastRealVersion.title,
        lastModifyingUser: '',
        modifiedTime: googleDocVersion.modifiedTime,
        createdAt: googleDocVersion.modifiedTime,
        updatedAt: googleDocVersion.modifiedTime
    }
}

/**
 * 
    Picking algorithm:
    Look for existing slices where there is a text difference between the slices end version and the next slices start version,
        this means the doc was edited outside of ABE
    Collect google doc version between those 2 timestamps, and create a slice out of that.
 */
export function collectGoogleDocSlicesOutsideOfSessions(currentSlices: TimelineSlice[], googleDocVersions: GoogleDocVersion[]): TimelineSlice[]{
    if(!currentSlices.length){
        console.log("No current slices")
        return [];
    }
    const newSlices: TimelineSlice[] = [];

    // get edits made in google doc after the last slice (modified outside of ABE and didn't come back)
    const lastSlice = currentSlices[currentSlices.length - 1];
    const lastSliceEndVersion = lastSlice.versions[lastSlice.versions.length - 1];
    const googleDocVersionsAfterLastSlice = googleDocVersions.filter(version => {
        const modifiedTime = new Date(version.modifiedTime).getTime();
        const lastSliceEndVersionTime = new Date(lastSliceEndVersion.createdAt).getTime();
        return modifiedTime > lastSliceEndVersionTime;
    })
    if(googleDocVersionsAfterLastSlice.length > 0){
        newSlices.push({
            startReason: TimelinePointType.EDITED_OUTSIDE_OF_ABE,
            versions: googleDocVersionsAfterLastSlice.map(version => {
                return convertGoogleDocVersionToIGdocVersion(version, lastSliceEndVersion)
            })
        })
    }

    // look for slices where there is a text difference between the slices end version and the next slices start version,
    //  and creating an array of start points and end points to collect google doc versions between those timestamps
    const versionBoundaries: VersionBoundaries[] = [];
    for(let i = 0; i < currentSlices.length - 1; i++){
        const currentSlice = currentSlices[i];
        const nextSlice = currentSlices[i + 1];
        const endVersion = currentSlice.versions[currentSlice.versions.length - 1];
        const startVersion = nextSlice.versions[0];
        if(endVersion.plainText !== startVersion.plainText){
            versionBoundaries.push({
                endOfLastSlice: endVersion,
                startOfNewSlice: startVersion
            })
        }
    }
    // collect google doc versions between the timestamps, and create slices out of them
    versionBoundaries.forEach(versionBoundary => {
        const googleDocVersionsWithinTimestamps = googleDocVersions.filter(version => {
            const modifiedTime = new Date(version.modifiedTime).getTime();
            const endOfLastSliceTime = new Date(versionBoundary.endOfLastSlice.createdAt).getTime();
            const startOfNewSliceTime = new Date(versionBoundary.startOfNewSlice.createdAt).getTime();
            return modifiedTime > endOfLastSliceTime && modifiedTime < startOfNewSliceTime
        })
        if(googleDocVersionsWithinTimestamps.length > 0){
            newSlices.push({
                startReason: TimelinePointType.EDITED_OUTSIDE_OF_ABE,
                versions: googleDocVersionsWithinTimestamps.map(version => {
                    return convertGoogleDocVersionToIGdocVersion(version, versionBoundary.endOfLastSlice)
                })
            })
        }
    })

    return newSlices;
}