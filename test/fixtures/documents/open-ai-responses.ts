import OpenAI from "openai";
import { ReverseOutline } from "../../../src/functions/timeline/functions/reverse-outline";

export const textOpenAiResponse = (response: string): OpenAI.Chat.Completions.ChatCompletion => ({
    "id": "123",
    "object": "chat.completion",
    "created": 1713997085,
    "model": "gpt-3.5-turbo-16k-0613",
    "choices": [
      {
        "index": 0,
        "message": {
          "role": "assistant",
          "content": response
        },
        "logprobs": null,
        "finish_reason": "stop"
      }
    ],
    "usage": {
      "prompt_tokens": 407,
      "completion_tokens": 72,
      "total_tokens": 479
    },
  })

  export const reverseOutlineResponse = (response: ReverseOutline): OpenAI.Chat.Completions.ChatCompletion => ({
    "id": "123",
    "object": "chat.completion",
    "created": 1713997085,
    "model": "gpt-3.5-turbo-16k-0613",
    "choices": [
      {
        "index": 0,
        "message": {
          "role": "assistant",
          "content": JSON.stringify(response)
        },
        "logprobs": null,
        "finish_reason": "stop"
      }
    ],
    "usage": {
      "prompt_tokens": 407,
      "completion_tokens": 72,
      "total_tokens": 479
    },
  })
