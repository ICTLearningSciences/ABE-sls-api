import { AiRequestContext, OpenAiPromptStep } from "../../types.js";

export abstract class AiService {
    serviceName: string;

    constructor(
        serviceName: string
    ) {
        this.serviceName = serviceName;
    }

    abstract completeChat(context: AiRequestContext, overrideModel?: string): Promise<any>;

}