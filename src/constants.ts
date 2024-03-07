import { GptModels } from "./types.js";

export const SYSTEM_ASSIGNMENT =
    "Provided is the plain text from a text document that was written by a student writer. It is your job to look for any mistakes made in the text or any improvements that can be made to the text."
export const USER_GUARDRAILS = "Only respond with the JSON output in the exact format of the following improvement template and no other words or symbols. The output must be valid JSON. Check that the output is valid JSON. \n\n"
export const IMPROVEMENT_TEMPLATE = {
        "IMPROVEMENT_1": {
            "TEXT_TO_IMPROVE": "string // The text that you want to improve",
            "IMPROVEMENT_EXPLANATION": "string // The explanation of the improvement you want to make to the text"
        },
        "IMPROVEMENT_2": {
            "TEXT_TO_IMPROVE": "string // The text that you want to improve",
            "IMPROVEMENT_EXPLANATION": "string // The explanation of the improvement you want to make to the text"
        },
        "IMPROVEMENT_3": {
            "TEXT_TO_IMPROVE": "string // The text that you want to improve",
            "IMPROVEMENT_EXPLANATION": "string // The explanation of the improvement you want to make to the text"
        }
}
export const RETRY_ATTEMPTS = 3;
export const OPENAI_DEFAULT_TEMP = 0.1;

export const MAX_OPEN_AI_CHAIN_REQUESTS = 10;
export const MAX_OPEN_AI_MESSAGES = 10;

export const DEFAULT_GPT_MODEL = GptModels.GPT_3_5;