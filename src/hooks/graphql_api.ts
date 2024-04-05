/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import axios from 'axios';
import {
  GQLPromptRunResponse,
  OpenAIReqRes,
  OpenAiPromptStep,
  OpenAiStep,
  PromptConfiguration,
} from '../types.js';
import OpenAI from 'openai';
import {
  GQLDocumentTimeline,
  GQLIGDocVersion,
  GQLTimelinePoint,
  IGDocVersion,
} from '../functions/timeline/types.js';
import { execGql } from '../api.js';
import pkg from 'lodash';
const { omit } = pkg;
const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT || '';
const SECRET_HEADER_NAME = process.env.SECRET_HEADER_NAME || '';
const SECRET_HEADER_VALUE = process.env.SECRET_HEADER_VALUE || '';

export async function storeGoogleDoc(
  docId: string,
  userId: string,
  isAdminDoc: boolean,
  title?: string
): Promise<void> {
  const res = await axios
    .post(
      GRAPHQL_ENDPOINT,
      {
        query: `mutation StoreGoogleDoc($googleDoc: GoogleDocInputType!) {
        storeGoogleDoc(googleDoc: $googleDoc) {
            googleDocId
            user
                }
            }`,
        variables: {
          googleDoc: {
            googleDocId: docId,
            user: userId,
            admin: isAdminDoc,
            title: title,
          },
        },
      },
      {
        headers: {
          [SECRET_HEADER_NAME]: SECRET_HEADER_VALUE,
        },
      }
    )
    .catch((err) => {
      console.log(err.response.data);
      throw err;
    });
  return;
}

export async function storePromptRun(
  docId: string,
  userId: string,
  openAiPromptSteps: OpenAiPromptStep[],
  openAiReqres: OpenAIReqRes[]
): Promise<GQLPromptRunResponse> {
  const openAiSteps: OpenAiStep[] = openAiReqres.map((openAiReqres) => {
    return {
      openAiPromptStringify: JSON.stringify(openAiReqres.openAiPrompt),
      openAiResponseStringify: JSON.stringify(openAiReqres.openAiResponse),
    };
  });
  const res = await axios
    .post(
      GRAPHQL_ENDPOINT,
      {
        query: `mutation StorePromptRun($googleDocId: String!, $user: ID!, $openAiPromptSteps: [OpenAiPromptStepInputType]!, $openAiSteps: [OpenAiStepsInputType]!) {
            storePromptRun(googleDocId: $googleDocId, user: $user, openAiPromptSteps: $openAiPromptSteps, openAiSteps: $openAiSteps) {
                googleDocId
                user
                openAiPromptSteps {
                    prompts{
                      promptText
                      includeEssay
                      promptRole
                    }
                    outputDataType
                }
                openAiSteps {
                    openAiPromptStringify
                    openAiResponseStringify
                }
              }
         }`,
        variables: {
          googleDocId: docId,
          user: userId,
          openAiPromptSteps: openAiPromptSteps,
          openAiSteps: openAiSteps,
        },
      },
      {
        headers: {
          [SECRET_HEADER_NAME]: SECRET_HEADER_VALUE,
        },
      }
    )
    .catch((err) => {
      console.log(err.response.data);
      throw err;
    });
  return res.data.data.storePromptRun;
}

export async function fetchGoogleDocVersion(
  docId: string
): Promise<IGDocVersion[]> {
  return await execGql<IGDocVersion[]>(
    {
      query: `query FetchGoogleDocVersions($googleDocId: String!) {
        fetchGoogleDocVersions(googleDocId: $googleDocId) {
          docId
          plainText
          lastChangedId
          sessionId
          sessionIntention{
            description
            createdAt
          }
          dayIntention{
            description
            createdAt
          }
          documentIntention{
            description
            createdAt
          }
          chatLog {
            sender
            message
          }
          activity
          intent
          title
          lastModifyingUser
          modifiedTime
          createdAt
          updatedAt
        }
    }`,
      variables: {
        googleDocId: docId,
      },
    },
    {
      dataPath: ['fetchGoogleDocVersions'],
      axiosConfig: {
        headers: {
          [SECRET_HEADER_NAME]: SECRET_HEADER_VALUE,
        },
      },
    }
  );
}

export async function fetchDocTimeline(
  userId: string,
  docId: string
): Promise<GQLDocumentTimeline | undefined> {
  return await execGql<GQLDocumentTimeline>(
    {
      query: `query FetchDocTimeline($googleDocId: String!, $userId: String!) {
      fetchDocTimeline(googleDocId: $googleDocId, userId: $userId) {
          docId
          user
          timelinePoints{
              type
              versionTime
              version{
                  docId
                  plainText
                  lastChangedId
                  sessionId
                  sessionIntention{
                    description
                    createdAt
                  }
                  documentIntention{
                    description
                    createdAt
                  }
                  dayIntention{
                    description
                    createdAt
                  }
                  chatLog{
                      sender
                      message
                  }
                  activity
                  intent
                  title
                  lastModifyingUser
              }
              intent
              changeSummary
              reverseOutline
              relatedFeedback
          }
          }
      }`,
      variables: {
        googleDocId: docId,
        userId: userId,
      },
    },
    {
      dataPath: ['fetchDocTimeline'],
      axiosConfig: {
        headers: {
          [SECRET_HEADER_NAME]: SECRET_HEADER_VALUE,
        },
      },
    }
  );
}

export async function storeDocTimeline(
  docTimeline: GQLDocumentTimeline
): Promise<GQLDocumentTimeline> {
  // remove createdAt and updatedAt from document, unexpected by gql
  const inputDocs = docTimeline.timelinePoints.map((timelinePoint) => {
    const omittedTimestamps = omit(timelinePoint.version, [
      'createdAt',
      'updatedAt',
    ]);
    return {
      ...timelinePoint,
      version: {
        ...omittedTimestamps,
        dayIntention: timelinePoint.version.dayIntention
          ? omit(timelinePoint.version.dayIntention, ['createdAt'])
          : undefined,
        sessionIntention: timelinePoint.version.sessionIntention
          ? omit(timelinePoint.version.sessionIntention, ['createdAt'])
          : undefined,
        documentIntention: timelinePoint.version.documentIntention
          ? omit(timelinePoint.version.documentIntention, ['createdAt'])
          : undefined,
      },
    };
  });
  return await execGql<GQLDocumentTimeline>(
    {
      query: `mutation StoreDocTimeline($docTimeline: DocTimelineInputType!) {
      storeDocTimeline(docTimeline: $docTimeline) {
          docId
          user
          timelinePoints{
              type
              versionTime
              version{
                  docId
                  plainText
                  lastChangedId
                  sessionId
                  sessionIntention{
                    description
                    createdAt
                  }
                  documentIntention{
                    description
                    createdAt
                  }
                  dayIntention{
                    description
                    createdAt
                  }
                  chatLog{
                      sender
                      message
                  }
                  activity
                  intent
                  title
                  lastModifyingUser
              }
              intent
              changeSummary
              reverseOutline
              relatedFeedback
          }
          }
      }`,
      variables: {
        docTimeline: {
          ...docTimeline,
          timelinePoints: inputDocs,
        },
      },
    },
    {
      dataPath: ['storeDocTimeline'],
      axiosConfig: {
        headers: {
          [SECRET_HEADER_NAME]: SECRET_HEADER_VALUE,
        },
      },
    }
  );
}
