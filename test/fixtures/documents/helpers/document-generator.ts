import { drive_v3 } from "googleapis";
import { IGDocVersion } from "../../../../src/functions/timeline/types";
import {v4 as uuidv4} from "uuid";

export function isoStringMinsFromNow(mins: number): string {
    return new Date(Date.now() + mins * 60000).toISOString();
}

export type DocVersionGeneratorData = Partial<IGDocVersion>[];

/**
 * @param generatorData the number of documents to generate and any changes per document, else all the same
 * @returns an array of documents with the changes specified in the generatorData
 */
export function gqlDocVersionGenerator(generatorData: DocVersionGeneratorData): IGDocVersion[]{
    const docId = "1";
    const createdAt = new Date().toISOString();
    return generatorData.map((data) => ({
            docId,
            plainText: data.plainText || "This is test text",
            lastChangedId: data.lastChangedId || "ALBJ4L",
            sessionId: data.sessionId || "a8e0642b-d4b6-477c-94d1-8df7dc80e673",
            sessionIntention: data.sessionIntention || undefined,
            dayIntention: data.dayIntention || undefined,
            documentIntention: data.documentIntention || undefined,
            chatLog: data.chatLog || [],
            activity: data.activity || "658230f699045156193339ac",
            intent: data.intent || "",
            title: data.title || "My Document",
            lastModifyingUser: data.lastModifyingUser || "fake@account.com",
            modifiedTime: data.modifiedTime || createdAt,
            createdAt: data.createdAt || createdAt,
            updatedAt: createdAt
        }))
}

export type ExternalGoogleDocRevisionGeneratorData = Partial<drive_v3.Schema$Revision>[];

/**
 * @param generatorData the number of external google doc revisions to generate and any changes per revision, else all the same
 * @returns an array of external google doc revisions with the changes specified in the generatorData
 */
export function externalGoogleDocRevisionGenerator( generatorData: ExternalGoogleDocRevisionGeneratorData): drive_v3.Schema$Revision[]{
    const dateNow = new Date().toISOString();
    return generatorData.map((data) => ({
        id: data.id || uuidv4(),
        exportLinks: data.exportLinks || {
            "text/plain": "https://docs.google.com/feeds/download/documents/export/Export?id=1FNfuMjrDjPmdZ0yihQtmzm7zbA54c-khNRvSvM6IAlg&revision=1&exportFormat=txt"
        },
        modifiedTime: data.modifiedTime || dateNow,
        lastModifyingUser: data.lastModifyingUser || {
            displayName: "fake@gmail.com",
            kind: "drive#user",
            me: false,
            permissionId: "03072798018713957462",
            emailAddress: "fake@gmail.com",
            photoLink: "https://lh3.googleusercontent.com/a-/ALV-UjXKexEtVWCC6UwIStDHt31VywY6YTZTpkDHIMhVo8ofAa6-gxU=s64"
        }
    }))
}