import OpenAI from "openai";
import { WebSocket } from "ws";
import { RetellRequest, RetellResponse, Utterance } from "./types";
import agentObjective from "./agentObjective";
import createAssistantPrompt from "./assistantPrompt";

export default class OpenAiClient {
  private client: OpenAI;
  private assistantName: string;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_APIKEY,
      organization: process.env.OPENAI_ORGANIZATION_ID,
    });
  }

  setAssistantName(assistantName: string) {
    this.assistantName = assistantName;
  }

  async DraftResponse(request: RetellRequest, ws: WebSocket) {
    if (request.interaction_type === "update_only") {
      // process live transcript update if needed
      return;
    }

    const requestMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
      preparePrompt(request, this.assistantName);

    try {
      const completions = await this.client.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: requestMessages,
        stream: true,
        temperature: 0.3,
        frequency_penalty: 1,
        max_tokens: 500,
      });

      // const response = [];

      for await (const completion of completions) {
        if (completion.choices.length >= 1) {
          const delta = completion.choices[0].delta;
          
          if (!delta || !delta.content) continue;

          const res = buildResponse(request, delta.content, false);
          
          ws.send(JSON.stringify(res));
          // response.push(res);
        }
      }

      // return response;
    } catch (err) {
      console.error("Error in gpt stream: ", err);
    } finally {
      const res = buildResponse(request, "");
     
      // ws.send(JSON.stringify(res));
      return res;
    }
  }
}

export function buildResponse(
  request: RetellRequest,
  content: string,
  contentComplete: boolean = true
): RetellResponse {
  return {
    response_id: request.response_id,
    content,
    content_complete: contentComplete,
    end_call: false,
  };
}


function preparePrompt(request: RetellRequest, assistantName: string) {
  const transcript = createTranscript(
    request.transcript
  );
  const requestMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
    [
      {
        role: "system",
        content: agentObjective + createAssistantPrompt(assistantName),
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
