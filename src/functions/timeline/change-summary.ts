/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import OpenAI from 'openai';
import { DEFAULT_GPT_MODEL } from '../../constants.js';
import { executeOpenAiUntilProperResponse } from '../../hooks/use-with-open-ai.js';

export async function changeSummaryPromptRequest(
  lastVersionText: string,
  currentVersionText: string
) {
  const isCurrentVersionFirstVersion = !lastVersionText;

  const compareVersionsParams: OpenAI.Chat.Completions.ChatCompletionCreateParams =
    {
      messages: [
        {
          role: 'assistant',
          content: `Previous Version: ${lastVersionText}`,
        },
        {
          role: 'assistant',
          content: `Current Version: ${currentVersionText}`,
        },
        {
          role: 'system',
          content: `Provided are two versions of a text document, a previous version and a current version.
              Please summarize the differences between the two versions in 1 to 3 sentences.
              The first sentence should give a clear statement on biggest changes and the scope of the changes such as major additions / deletions, major revisions, minor changes. The second and third sentences should clearly refer to what specific areas of the document changed substantially, with more specifics about what changed.
              The second and third sentences are optional and are not needed if only minor changes were made.
              `,
        },
      ],
      model: DEFAULT_GPT_MODEL,
    };

  const summarizeVersionParams: OpenAI.Chat.Completions.ChatCompletionCreateParams =
    {
      messages: [
        {
          role: 'assistant',
          content: `Here is the essay: ${currentVersionText}`,
        },
        {
          role: 'system',
          content: `Please summarize the essay in 3 sentences.
              `,
        },
      ],
      model: DEFAULT_GPT_MODEL,
    };

  const [res] = await executeOpenAiUntilProperResponse(
    isCurrentVersionFirstVersion
      ? summarizeVersionParams
      : compareVersionsParams,
    false
  );
  return res.choices[0].message.content || '';
}
