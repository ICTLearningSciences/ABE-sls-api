import axios from "axios";
import { GQLPromptRunResponse, OpenAIReqRes, OpenAiPromptStep, OpenAiStep, PromptConfiguration } from "../types.js";
import OpenAI from "openai";
import { GQLDocumentTimeline, GQLIGDocVersion, GQLTimelinePoint, IGDocVersion } from "../functions/timeline/types.js";
import { execGql } from "../api.js";
import pkg from 'lodash';
const { omit } = pkg;
const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT || ""
const SECRET_HEADER_NAME = process.env.SECRET_HEADER_NAME || '';
const SECRET_HEADER_VALUE = process.env.SECRET_HEADER_VALUE || '';

export async function storeGoogleDoc(
    docId: string,
    userId: string,
    isAdminDoc: boolean,
    title?: string
  ): Promise<void> {
    const res = await axios.post(GRAPHQL_ENDPOINT, {
      query: `mutation StoreGoogleDoc($googleDocId: String!, $user: ID, $isAdminDoc: Boolean, $title: String) {
        storeGoogleDoc(googleDocId: $googleDocId, user: $user, isAdminDoc: $isAdminDoc, title: $title) {
            googleDocId
            user
                }
            }`,
      variables: {
        googleDocId: docId,
        user: userId,
        isAdminDoc: isAdminDoc,
        title: title
      },
    },
    {
      headers: {
        [SECRET_HEADER_NAME]: SECRET_HEADER_VALUE
      }
    }
    
    ).catch((err) => {
      console.log(err.response.data);
      throw err;
    })
    return;
  }

  export async function storePromptRun(
    docId: string,
    userId: string,
    openAiPromptSteps: OpenAiPromptStep[],
    openAiReqres: OpenAIReqRes[]
  ): Promise<GQLPromptRunResponse> {
    const openAiSteps: OpenAiStep[] = openAiReqres.map((openAiReqres)=>{
        return {
            openAiPromptStringify: JSON.stringify(openAiReqres.openAiPrompt),
            openAiResponseStringify: JSON.stringify(openAiReqres.openAiResponse)
        }
    })
    const res = await axios.post(GRAPHQL_ENDPOINT, {
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
        openAiSteps: openAiSteps
      },
    },
    {
      headers: {
        [SECRET_HEADER_NAME]: SECRET_HEADER_VALUE
      }
    }
    
    ).catch((err) => {
      console.log(err.response.data);
      throw err;
    })
    return res.data.data.storePromptRun;
  }

  export async function fetchGoogleDocVersion(docId: string): Promise<IGDocVersion[]>{
    return await execGql<IGDocVersion[]>({
      query: `query FetchGoogleDocVersions($googleDocId: String!) {
        fetchGoogleDocVersions(googleDocId: $googleDocId) {
          docId
          plainText
          lastChangedId
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
      }},
      {
        dataPath: ['fetchGoogleDocVersions'],
        axiosConfig:{
          headers:{
            [SECRET_HEADER_NAME]: SECRET_HEADER_VALUE
          }
        }
      })
}

export async function fetchDocTimeline(userId: string, docId: string): Promise<GQLDocumentTimeline | undefined>{
  return await execGql<GQLDocumentTimeline>({
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
      userId: userId
    }},
    {
      dataPath: ['fetchDocTimeline'],
      axiosConfig:{
        headers:{
          [SECRET_HEADER_NAME]: SECRET_HEADER_VALUE
        }
      }
    })
}

export async function storeDocTimeline(docTimeline: GQLDocumentTimeline): Promise<GQLDocumentTimeline>{
  // remove createdAt and updatedAt from document, unexpected by gql
  const inputDocs = docTimeline.timelinePoints.map((timelinePoint) => {
    return{
      ...timelinePoint,
      version: omit(timelinePoint.version, ['createdAt', 'updatedAt'])
    }
  });
  return await execGql<GQLDocumentTimeline>({
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
        timelinePoints: inputDocs
      }
    }},
    {
      dataPath: ['storeDocTimeline'],
      axiosConfig:{
        headers:{
          [SECRET_HEADER_NAME]: SECRET_HEADER_VALUE
        }
      }
    })
}