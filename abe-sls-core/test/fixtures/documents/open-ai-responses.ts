import OpenAI from "openai";
import { OpenAiResType } from "../../../src/ai_services/openai/open-ai-service";

export function textOpenAiResponse(response: string): OpenAiResType {
  const res: OpenAiResType = {
    "id": "resp_67dc7ebc06dc819289afec75d63dd4cd0613b3084b7f7cef",
    "object": "response",
    "created_at": 1742503612,
    "status": "completed",
    "error": null,
    "incomplete_details": null,
    "instructions": null,
    "max_output_tokens": null,
    "model": "gpt-4o-mini-2024-07-18",
    "output": [
        {
            "type": "message",
            "id": "msg_67dc7ebdaf6c8192828869399f9234870613b3084b7f7cef",
            "status": "completed",
            "role": "assistant",
            "content": [
                {
                    "type": "output_text",
                    "text": response,
                    "annotations": []
                }
            ]
        }
    ],
    "parallel_tool_calls": true,
    "previous_response_id": null,
    "reasoning": {
        "effort": null,
        "generate_summary": null
    },
    "temperature": 1,
    "text": {
        "format": {
            "type": "text"
        }
    },
    "tool_choice": {
        "type": "web_search_preview"
    },
    "tools": [
        {
            "type": "web_search_preview",
            "search_context_size": "medium",
            "user_location": {
                "type": "approximate",
                "city": undefined,
                "country": "US",
                "region": undefined,
                "timezone": undefined
            }
        }
    ],
    "top_p": 1,
    "truncation": "disabled",
    "usage": {
        "input_tokens": 336,
        "input_tokens_details": {
            "cached_tokens": 0
        },
        "output_tokens": 221,
        "output_tokens_details": {
            "reasoning_tokens": 0
        },
        "total_tokens": 557
    },
    "user": undefined,
    "metadata": {},
    "output_text": response
  }
  return res
}

