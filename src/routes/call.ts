import { RawData, WebSocket } from "ws";
import { Request } from "express";
import { concat } from "@langchain/core/utils/stream";

import type { RetellRequest, RetellResponse } from "@/types";

import { runnableWithMessageHistory as runnable, toolsByName } from "@/lib/llm";
import { chatQueue } from "@/jobs";

export default async (ws: WebSocket, req: Request) => {
  const res: RetellResponse = {
    response_id: 0,
    content: "hey",
    content_complete: true,
    end_call: false,
  };

  let state: any = {};

  // tell retell to send call metadata to use for setting up the prompt
  ws.send(
    JSON.stringify({
      response_type: "config",
      config: {
        call_details: true,
      },
    })
  );

  ws.send(JSON.stringify(res));

  ws.on("message", async (data: RawData, isBinary: boolean) => {
    if (isBinary) {
      ws.close(1002, "binary data not supported");
    }

    const request: RetellRequest = JSON.parse(data.toString());

    if (request.interaction_type === "update_only") return;

    if (request.interaction_type === "call_details") {
      state = request.call.metadata;
      return;
    }

    const message = {
      agent_name: "Wai",
      caller_name: state.caller.name,
      caller_preferences: JSON.stringify(state.caller.preferences),
      input: request.transcript[request.transcript.length - 1].content,
    };

    const options = {
      configurable: {
        sessionId: req.params.id,
      },
    };

    const stream = await runnable.stream(message, options);

    let gathered = undefined;
    const toolMessages = [];

    for await (const chunk of stream) {
      gathered = gathered !== undefined ? concat(gathered, chunk) : chunk;

      if (chunk.content) {
        ws.send(
          JSON.stringify({
            response_id: request.response_id,
            content: chunk.content,
            content_complete: false,
            end_call: false,
          })
        );
      }

      if (chunk.response_metadata.finish_reason === "stop") {
        // send content to background job to do stuff like generate images for a story
        chatQueue.add("chat", { content: gathered.content });
      }

      if (chunk.response_metadata.finish_reason === "tool_calls") {
        const toolCalls = gathered.tool_calls;

        // // to pass `ws` we'll need to do something like this: https://js.langchain.com/v0.2/docs/how_to/tool_runtime
        for (const toolCall of toolCalls) {
          ws.send(
            JSON.stringify({
              response_id: request.response_id,
              content: toolCall.args.message,
              content_complete: true,
              end_call: false,
            })
          );

          const tool = toolsByName[toolCall.name];
          const toolMessage = await tool.invoke(toolCall);

          // getting this error: "An assistant message with 'tool_calls' must be followed by tool toolMessages responding to each 'tool_call_id'.
          toolMessages.push(toolMessage);
        }

        // await runnable.invoke(toolMessages, options);
      }
    }
  });

  // TODO: update call end time
  ws.on("close", async (_err) => {
    console.error(_err);
  });
};
