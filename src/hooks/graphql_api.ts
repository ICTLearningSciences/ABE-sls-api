import axios from "axios";
import { GQLPromptRunResponse, OpenAIReqRes, OpenAiPromptStep, OpenAiStep, PromptConfiguration } from "../types";
import OpenAI from "openai";
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