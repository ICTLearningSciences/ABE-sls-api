import { drive_v3 } from "googleapis";
import { GQLDocumentTimeline, IGDocVersion, AiGenerationStatus, TimelinePointType } from "../../../../src/functions/timeline/types";
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

export const emptyDocTimeline: GQLDocumentTimeline = {
    "docId": "1L4U07KVne3V6u3cBKJ9BTb_pZ6DDXwCqG75-mJIZfGA",
    "user": "653972706e601e65dbc3acea",
    "timelinePoints": [
      {
        "type": TimelinePointType.START,
        "versionTime": "2024-04-05T00:38:11.808Z",
        "version": {
          "docId": "1L4U07KVne3V6u3cBKJ9BTb_pZ6DDXwCqG75-mJIZfGA",
          "plainText": "Ponies, those magical creatures of the countryside, embody a spirit of freedom and adventure that captivates the imagination. Whether galloping across open fields or delicately grazing in serene pastures, they exude an aura of grace and elegance. With their sturdy frames and spirited personalities, ponies are not just animals but beloved friends, offering companionship and loyalty to those fortunate enough to earn their trust. From the playful antics of foals to the wisdom of seasoned veterans, each pony carries a unique story, weaving into the tapestry of human lives with a touch of whimsy and wonder.\n\n",
          "lastChangedId": "ALBJ4Lsds7ldPRWDgVQb3z3VyO9JtDX6BQYJSvN_fxvS-vmiJxxIL1othOotgmXRyFUC1lN2z-p6tZaNYvV9_XI",
          "sessionId": "a8e0642b-d4b6-477c-94d1-8df7dc80e673",
          "sessionIntention": undefined,
          "documentIntention": undefined,
          "dayIntention": undefined,
          "chatLog": [],
          "activity": "658230f699045156193339ac",
          "intent": "",
          "title": "2 sessions, 1 inbetween outside of ABE",
          "lastModifyingUser": "ashiel408@gmail.com",
          modifiedTime: "2024-04-05T00:38:11.808Z",
          createdAt: "2024-04-05T00:38:11.808Z",
            updatedAt: "2024-04-05T00:38:11.808Z"
        },
        "intent": "",
        "changeSummary": "The essay describes ponies as magical creatures that embody freedom and adventure. They are described as graceful and elegant animals that offer companionship and loyalty to those who earn their trust. The essay also emphasizes the diverse stories and personalities of ponies, which add whimsy and wonder to human lives.",
        "userInputSummary": "",
        changeSummaryStatus: AiGenerationStatus.COMPLETED,
        reverseOutlineStatus: AiGenerationStatus.COMPLETED,
        "reverseOutline": "{\n  \"Thesis Statement\": \"Ponies are not just animals but beloved friends, offering companionship and loyalty to those fortunate enough to earn their trust.\",\n  \"Supporting Claims\": [\n    \"Ponies embody a spirit of freedom and adventure that captivates the imagination.\",\n    \"Ponies have a grace and elegance that is captivating.\",\n    \"Ponies offer companionship and loyalty to their human counterparts.\"\n  ],\n  \"Evidence Given for Each Claim\": [\n    {\n      \"Claim A\": \"Ponies galloping across open fields and grazing in serene pastures embody a spirit of freedom and adventure.\",\n      \"Claim A Evidence\": [\n        \"Gallop across open fields\",\n        \"Grazing in serene pastures\"\n      ]\n    },\n    {\n      \"Claim B\": \"Ponies exude an aura of grace and elegance with their sturdy frames and spirited personalities.\",\n      \"Claim B Evidence\": [\n        \"Sturdy frames\",\n        \"Spirited personalities\"\n      ]\n    },\n    {\n      \"Claim C\": \"Ponies offer companionship and loyalty to those who earn their trust.\",\n      \"Claim C Evidence\": [\n        \"Playful antics of foals\",\n        \"Wisdom of seasoned veterans\"\n      ]\n    }\n  ]\n}",
        "relatedFeedback": ""
      },
      {
        "type": TimelinePointType.EDITED_OUTSIDE_OF_ABE,
        "versionTime": "2024-04-05T00:38:53.943Z",
        "version": {
          "docId": "41",
          "plainText": "Ponies, those magical creatures of the countryside, embody a spirit of freedom and adventure that captivates the imagination. Whether galloping across open fields or delicately grazing in serene pastures, they exude an aura of grace and elegance. With their sturdy frames and spirited personalities, ponies are not just animals but beloved friends, offering companionship and loyalty to those fortunate enough to earn their trust. From the playful antics of foals to the wisdom of seasoned veterans, each pony carries a unique story, weaving into the tapestry of human lives with a touch of whimsy and wonder.\r\n\r\n\r\nHere is a new session within ABE (should be a google doc before this one)",
          "lastChangedId": "",
          "sessionId": "",
          "sessionIntention": undefined,
          "documentIntention": undefined,
          "dayIntention": undefined,
          "chatLog": [],
          "activity": "",
          "intent": "",
          "title": "2 sessions, 1 inbetween outside of ABE",
          "lastModifyingUser": "",
          createdAt: "2024-04-05T00:38:53.943Z",
            modifiedTime: "2024-04-05T00:38:53.943Z",
            updatedAt: "2024-04-05T00:38:53.943Z"
        },
        "intent": "",
        "changeSummary": "The biggest change between the previous version and the current version is a major revision in the overall tone and description of ponies. In the current version, there is a more detailed and poetic description of their characteristics and their role in human lives. Additionally, there are minor changes throughout the document, such as rephrasing and sentence structure improvements.",
        "userInputSummary": "",
        changeSummaryStatus: AiGenerationStatus.COMPLETED,
        reverseOutlineStatus: AiGenerationStatus.COMPLETED,
        "reverseOutline": "{\n    \"Thesis Statement\": \"Ponies are beloved companions that bring joy and adventure to people's lives.\",\n    \"Supporting Claims\": [\n        \"Ponies embody a spirit of freedom and adventure.\",\n        \"Ponies offer companionship and loyalty to those who earn their trust.\",\n        \"Ponies have a unique story that adds whimsy and wonder to human lives.\"\n    ],\n    \"Evidence Given for Each Claim\": [\n        {\n            \"Claim A\": \"Ponies embody a spirit of freedom and adventure.\",\n            \"Claim A Evidence\": [\n                \"Galloping across open fields\",\n                \"Delicately grazing in serene pastures\"\n            ]\n        },\n        {\n            \"Claim B\": \"Ponies offer companionship and loyalty to those who earn their trust.\",\n            \"Claim B Evidence\": [\n                \"Sturdy frames and spirited personalities\",\n                \"Playful antics of foals\",\n                \"Wisdom of seasoned veterans\"\n            ]\n        },\n        {\n            \"Claim C\": \"Ponies have a unique story that adds whimsy and wonder to human lives.\",\n            \"Claim C Evidence\": [\n                \"Each pony carries a unique story\",\n                \"Weaving into the tapestry of human lives\"\n            ]\n        }\n    ]\n}",
        "relatedFeedback": ""
      },
      {
        "type": TimelinePointType.NEW_ACTIVITY,
        "versionTime": "2024-04-05T00:42:36.983Z",
        "version": {
          "docId": "1L4U07KVne3V6u3cBKJ9BTb_pZ6DDXwCqG75-mJIZfGA",
          "plainText": "",
          "lastChangedId": "ALBJ4Lse5jeFXBSsa9rIedts6LFgybQpN9tYYL6d8vJz8H7mZDvI9u8MpP7_sJBkw5AA3iwUIQi_uxZUN2QZHHA",
          "sessionId": "5e38b3f2-ebfb-444f-821e-2923a9cd4d0b",
          "sessionIntention": undefined,
          "documentIntention": undefined,
          "dayIntention": undefined,
          "chatLog": [],
          "activity": "658230f699045156193339ac",
          "intent": "",
          "title": "2 sessions, 1 inbetween outside of ABE",
          "lastModifyingUser": "ashiel408@gmail.com",
          createdAt: "2024-04-05T00:42:36.983Z",
            modifiedTime: "2024-04-05T00:42:36.983Z",
            updatedAt: "2024-04-05T00:42:36.983Z"
        },
        "intent": "",
        "changeSummary": "The current version includes some minor changes such as rephrasing certain sentences for clarity and flow, but overall, the structure and content remain unchanged. There are no major additions, deletions, or revisions in this version.",
        "userInputSummary": "",
        changeSummaryStatus: AiGenerationStatus.COMPLETED,
        reverseOutlineStatus: AiGenerationStatus.COMPLETED,
        "reverseOutline": "{\n    \"Thesis Statement\": \"Ponies are beloved animals that capture the imagination and provide companionship to humans.\",\n    \"Supporting Claims\": [\n        \"Ponies embody a spirit of freedom and adventure.\",\n        \"Ponies offer companionship and loyalty to those who earn their trust.\"\n    ],\n    \"Evidence Given for Each Claim\": [\n        {\n            \"Claim A\": \"Ponies embody a spirit of freedom and adventure.\",\n            \"Claim A Evidence\": [\"Galloping across open fields\", \"Delicately grazing in serene pastures\"]\n        },\n        {\n            \"Claim B\": \"Ponies offer companionship and loyalty to those who earn their trust.\",\n            \"Claim B Evidence\": [\"Playful antics of foals\", \"Wisdom of seasoned veterans\"]\n        }\n    ]\n}",
        "relatedFeedback": ""
      },
      {
        "type": TimelinePointType.NEW_ACTIVITY,
        "versionTime": "2024-04-19T18:01:56.789Z",
        "version": {
          "docId": "1L4U07KVne3V6u3cBKJ9BTb_pZ6DDXwCqG75-mJIZfGA",
          "plainText": "Ponies, those magical creatures of the countryside, embody a spirit of freedom and adventure that captivates the imagination. Whether galloping across open fields or delicately grazing in serene pastures, they exude an aura of grace and elegance. With their sturdy frames and spirited personalities, ponies are not just animals but beloved friends, offering companionship and loyalty to those fortunate enough to earn their trust. From the playful antics of foals to the wisdom of seasoned veterans, each pony carries a unique story, weaving into the tapestry of human lives with a touch of whimsy and wonder.\n\nHere is a new session within ABE (should be a google doc before this one)\n",
          "lastChangedId": "ALBJ4Lse5jeFXBSsa9rIedts6LFgybQpN9tYYL6d8vJz8H7mZDvI9u8MpP7_sJBkw5AA3iwUIQi_uxZUN2QZHHA",
          "sessionId": "efdaa368-933f-4de9-831c-2225277be70d",
          "sessionIntention": undefined,
          "documentIntention": {
            "description": "An essay about love",
            "createdAt": "2024-04-24T01:19:39.029Z"
          },
          "dayIntention": undefined,
          "chatLog": [],
          "activity": "",
          "intent": "",
          "title": "2 sessions, 1 inbetween outside of ABE",
          "lastModifyingUser": "ashiel408@gmail.com",
          createdAt: "2024-04-19T18:01:56.789Z",
            modifiedTime: "2024-04-19T18:01:56.789Z",
            updatedAt: "2024-04-19T18:01:56.789Z"
        },
        "intent": "",
        "changeSummary": "",
        changeSummaryStatus: AiGenerationStatus.NONE,
        reverseOutlineStatus: AiGenerationStatus.NONE,
        "userInputSummary": "",
        "reverseOutline": "",
        "relatedFeedback": ""
      }
    ]
  }
