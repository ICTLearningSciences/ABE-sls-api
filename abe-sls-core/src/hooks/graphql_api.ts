/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import axios from 'axios';
import { GQLPromptRunResponse, AiPromptStep } from '../types.js';
import {
  GQLDocumentTimeline,
  IGDocVersion,
  StoredDocumentTimeline,
} from '../timeline-generation/types.js';
import { execGql } from '../api.js';
import pkg from 'lodash';
import { AiServiceModelConfigs, GQLAiStep } from '../gql_types.js';
import { AiServiceStepDataTypes } from '../ai_services/ai-service-factory.js';
const { omit } = pkg;
const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT || '';
const SECRET_HEADER_NAME = process.env.SECRET_HEADER_NAME || '';
const SECRET_HEADER_VALUE = process.env.SECRET_HEADER_VALUE || '';

export async function storeGoogleDoc(
  docId: string,
  userId: string,
  isAdminDoc: boolean,
  title?: string,
  courseAssignmentId?: string
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
            courseAssignmentId: courseAssignmentId,
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
  aiPromptSteps: AiPromptStep[],
  aiSteps: AiServiceStepDataTypes[]
): Promise<GQLPromptRunResponse> {
  const aiStepsStringified: GQLAiStep[] = aiSteps.map((step) => {
    return {
      aiServiceRequestParams: JSON.stringify(step.aiServiceRequestParams),
      aiServiceResponse: JSON.stringify(step.aiServiceResponse),
    };
  });
  return await execGql<GQLPromptRunResponse>(
    {
      query: `mutation StorePromptRun($googleDocId: String!, $user: ID!, $aiPromptSteps: [AiPromptStepInputType]!, $aiSteps: [AiStepsInputType]!) {
            storePromptRun(googleDocId: $googleDocId, user: $user, aiPromptSteps: $aiPromptSteps, aiSteps: $aiSteps) {
                googleDocId
              }
         }`,
      variables: {
        googleDocId: docId,
        user: userId,
        aiPromptSteps: aiPromptSteps,
        aiSteps: aiStepsStringified,
      },
    },
    {
      dataPath: ['storePromptRun'],
      axiosConfig: {
        headers: {
          [SECRET_HEADER_NAME]: SECRET_HEADER_VALUE,
        },
      },
    }
  );
}

export async function fetchGoogleDocVersion(
  docId: string
): Promise<IGDocVersion[]> {
  return await execGql<IGDocVersion[]>(
    {
      query: `query FetchGoogleDocVersions($googleDocId: String!) {
        fetchGoogleDocVersions(googleDocId: $googleDocId) {
          _id
          docId
          markdownText
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

export async function fetchMostRecentVersion(
  docId: string
): Promise<IGDocVersion | undefined> {
  return await execGql<IGDocVersion>(
    {
      query: `query FetchMostRecentVersion($googleDocId: String!) {
          fetchMostRecentVersion(googleDocId: $googleDocId) {
          docId
          markdownText
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
      dataPath: ['fetchMostRecentVersion'],
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
): Promise<StoredDocumentTimeline | undefined> {
  return await execGql<StoredDocumentTimeline>(
    {
      query: `query FetchDocTimeline($googleDocId: String!, $userId: String!) {
      fetchDocTimeline(googleDocId: $googleDocId, userId: $userId) {
          docId
          user
          timelinePoints{
              type
              versionTime
              versionId
              version{
                  docId
                  markdownText
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
              changeSummaryStatus
              userInputSummary
              reverseOutline
              reverseOutlineStatus
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
  docTimeline: StoredDocumentTimeline
): Promise<StoredDocumentTimeline> {
  // remove createdAt and updatedAt from document, unexpected by gql
  const inputDocs = docTimeline.timelinePoints;
  return await execGql<StoredDocumentTimeline>(
    {
      query: `mutation StoreDocTimeline($docTimeline: DocTimelineInputType!) {
      storeDocTimeline(docTimeline: $docTimeline) {
          docId
          user
          timelinePoints{
              type
              versionTime
              versionId
              intent
              changeSummary
              changeSummaryStatus
              userInputSummary
              reverseOutline
              reverseOutlineStatus
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

export function convertGQLDocumentTimelineToStoredDocumentTimeline(
  gqlDocumentTimeline: GQLDocumentTimeline
): StoredDocumentTimeline {
  return {
    ...gqlDocumentTimeline,
    timelinePoints: gqlDocumentTimeline.timelinePoints.map((timelinePoint) => {
      const copy = JSON.parse(JSON.stringify(timelinePoint));
      if (copy.version) {
        delete (copy as any).version;
      }
      return {
        ...copy,
        versionId: timelinePoint.version._id,
      };
    }),
  };
}

export function fetchAiServiceModelConfigs(): Promise<AiServiceModelConfigs[]> {
  return execGql<AiServiceModelConfigs[]>(
    {
      query: `query {
          fetchConfig {
            aiServiceModelConfigs {
              serviceName
              modelList {
                name
                maxTokens
                supportsWebSearch
              }
            }
          }
        }`,
    },
    {
      dataPath: ['fetchConfig', 'aiServiceModelConfigs'],
      axiosConfig: {
        headers: {
          [SECRET_HEADER_NAME]: SECRET_HEADER_VALUE,
        },
      },
    }
  );
}

export interface FetchInstructorEmailsResponse {
  userData: {
    email: string;
  };
}

export async function fetchInstructorEmails(
  courseId: string,
  accessToken: string
): Promise<string[]> {
  const res = await execGql<FetchInstructorEmailsResponse[]>(
    {
      query: `query FindInstructorsForCourse($courseId: ID!){
            findInstructorsForCourse(courseId: $courseId) {
                userData {
                    email
                }
            }
        }`,
      variables: {
        courseId: courseId,
      },
    },
    {
      dataPath: ['findInstructorsForCourse'],
      axiosConfig: {
        headers: {
          [SECRET_HEADER_NAME]: SECRET_HEADER_VALUE,
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );
  return res.map((user) => user.userData.email).filter((email) => email);
}
