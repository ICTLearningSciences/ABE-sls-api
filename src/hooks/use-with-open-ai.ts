import OpenAI from 'openai';
import { OPENAI_MODEL, OPENAI_DEFAULT_TEMP, RETRY_ATTEMPTS, MAX_OPEN_AI_CHAIN_REQUESTS, MAX_OPEN_AI_MESSAGES } from '../constants.js';
import { getDocData } from '../api.js';
import { AuthHeaders, OpenAiActions } from '../functions/openai/open_ai.js';
import { ChatCompletionCreateParamsNonStreaming, ChatCompletionMessageParam } from 'openai/resources/index.js';
import { InputQuestionResponse, OpenAiPromptResponse, PromptConfiguration, PromptOutputTypes, PromptRoles, OpenAiPromptStep, SinglePromptResponse } from '../types.js';
import { storePromptRun } from './graphql_api.js';
import { isJsonString } from '../helpers.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30 * 1000, // 30 seconds (default is 10 minutes)
});

async function executeOpenAi(params: ChatCompletionCreateParamsNonStreaming){
    const result = await openai.chat.completions.create(params);
    if(!result.choices.length){
        throw new Error('OpenAI API Error: No choices provided.');
    }
    const answer = result.choices[0].message.content;
    if(!answer){
        throw new Error('OpenAI API Error: No response message content.');
    }
    return result;
}

export function useWithOpenAI(){
    const temparature = OPENAI_DEFAULT_TEMP;
    
    async function asyncAskAboutGDoc(docsId: string, userId:string, openAiPromptSteps: OpenAiPromptStep[], systemPrompt: string, authHeaders:AuthHeaders, openAiModel: string): Promise<OpenAiPromptResponse>{
        const response = await openAiMultistepPrompts(openAiPromptSteps, docsId, userId, authHeaders, systemPrompt, openAiModel);
        return response;
    }

    async function askAboutGDoc(docsId: string, userId:string, openAiPromptSteps: OpenAiPromptStep[], systemPrompt: string, authHeaders:AuthHeaders, openAiModel: string): Promise<OpenAiPromptResponse>{
        return openAiMultistepPrompts(openAiPromptSteps, docsId, userId, authHeaders, systemPrompt, openAiModel);
    }

    /**
     * Handles multistep prompts which use the output of the previous prompt as the input for the next prompt.
     * Each individual prompt does not know what the previous prompt was.
     */
    async function openAiMultistepPrompts(openAiSteps: OpenAiPromptStep[], docsId: string, userId: string, authHeaders: AuthHeaders, systemPrompt: string, openAiModel: string): Promise<OpenAiPromptResponse>{
        if(openAiSteps.length >= MAX_OPEN_AI_CHAIN_REQUESTS){
            throw new Error(`Please limit the number of prompts to ${MAX_OPEN_AI_CHAIN_REQUESTS} or less`)
        }
        const openAiResponses: OpenAiPromptResponse = {
            openAiData: [],
            answer: ""
        };
        const docsContent = await getDocData(docsId, authHeaders);
        const docsPlainText = docsContent.plainText;
        let previousOutput = "";
        for(let i = 0; i < openAiSteps.length; i++){
            const curOpenAiStep = openAiSteps[i];
            const messages: ChatCompletionMessageParam[] = []
            messages.push({
                role: "system",
                content: systemPrompt
            })
            if(previousOutput){
                messages.push({role: "assistant", content: previousOutput})
            }
            curOpenAiStep.prompts.forEach((prompt)=>{
                const role = prompt.promptRole || PromptRoles.USER;
                const content = prompt.promptText;
                if(prompt.includeEssay){
                    messages.push({role: PromptRoles.SYSTEM, content: `\n\nHere is the users essay: -----------\n\n${docsPlainText}`})
                }
                messages.push({role, content})
            })
            const params: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
                messages: messages,
                model: openAiModel,
            };

            let result = await executeOpenAi(params);
            let answer = result.choices[0].message.content;
            if(curOpenAiStep.outputDataType == PromptOutputTypes.JSON){
                console.log("validating output is json")
                let isJsonResponse = isJsonString(answer);
                if(!isJsonResponse){
                    for(let j = 0; j < RETRY_ATTEMPTS; j++){
                        console.log(`Attempt ${j}`)
                        if(isJsonResponse){
                            break;
                        }
                        const newParams: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
                            ...params,
                            temperature: temparature + j * 0.1
                        }
                        result = await executeOpenAi(newParams);
                        answer = result.choices[0].message.content;
                        if(!answer){
                            throw new Error('OpenAI API Error: No response message content.');
                        }
                        isJsonResponse = isJsonString(answer);
                    }
                }
                if(!isJsonResponse){
                    throw new Error(`OpenAI API Error: No valid JSON response after ${RETRY_ATTEMPTS} attempts.`);
                }
            }

            if(!answer){
                throw new Error('OpenAI API Error: No response message content.');
            }

            openAiResponses.openAiData.push({
                openAiPrompt: params,
                openAiResponse: result.choices,
                originalRequestPrompts: curOpenAiStep
            })
            previousOutput = answer;
            openAiResponses.answer = answer;
        }
        console.log(JSON.stringify(openAiResponses, null, 2))

        try{
            await storePromptRun(docsId, userId, openAiSteps, openAiResponses.openAiData)
        }catch(err){
            console.error("Failed to store prompt run in gql")
            console.log(err)
        }finally{
            return openAiResponses;
        }
    }

    return{
        askAboutGDoc,
        asyncAskAboutGDoc
    }
}