import OpenAI from "openai";
import { RetellRequest, Utterance } from "./types";
import createAssistantPrompt from "./assistantPrompt";
import tools from "./tools";
import { Json } from "./types/supabase";

const MODEL = "gpt-4-turbo-preview";
// const MODEL = "LLaMA_CPP";

const openai: OpenAI = new OpenAI({
  // baseURL: "http://localhost:9000/v1", // uncomment to run llamafile https://github.com/Mozilla-Ocho/llamafile
  apiKey: process.env.OPENAI_APIKEY,
  organization: process.env.OPENAI_ORGANIZATION_ID,
});

export async function createStreamingCompletion(
  prompt: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
) {
  const stream = await openai.chat.completions.create({
    model: MODEL,
    messages: prompt,
    // @ts-ignore
    tools,
    stream: true,
    temperature: 0.4,
    frequency_penalty: 1,
    max_tokens: 500,
  });

  return stream;
}

export function preparePrompt(
  request: RetellRequest,
  assistantName: string,
  caller?: { name: string; preferences: Json },
  callers?: { name: string }[],
  previousTranscripts?: string,
  timezone?: string
) {
  const transcript = createTranscript(request.transcript);
  const requestMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
    [
      {
        role: "system",
        content: createAssistantPrompt(
          assistantName,
          caller,
          callers,
          previousTranscripts,
          timezone
        ),
      },
    ];

  for (const message of transcript) {
    requestMessages.push(message);
  }

  if (request.interaction_type === "reminder_required") {
    // Change this content if you want a different reminder message
    requestMessages.push({
      role: "user",
      content: "(Now the user has not responded in a while, you would say:)",
    });
  }

  return requestMessages;
}

function createTranscript(conversation: Utterance[]) {
  const result: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

  for (let turn of conversation) {
    result.push({
      role: turn.role === "agent" ? "assistant" : "user",
      content: turn.content,
    });
  }
  return result;
}
