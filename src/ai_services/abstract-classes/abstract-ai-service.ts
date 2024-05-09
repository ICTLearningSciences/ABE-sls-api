import { AiRequestContext } from "../../types.js";

/**
 * Response from OpenAI API
 */
export interface CompleteChatResponse{
    reqParamsString: string, // request parameters sent to AI service, stringified
    responseString: string, // response from AI service, stringified
    answer: string // primary answer from AI service
}

export abstract class AiService {
    serviceName: string;

    constructor(
        serviceName: string
    ) {
        this.serviceName = serviceName;
    }

    abstract convertContextDataToServiceParams(
        requestContext: AiRequestContext,
        overrideModel?: string
    ): any

    abstract completeChat(context: AiRequestContext, overrideModel?: string): Promise<CompleteChatResponse>;

}