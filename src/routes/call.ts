import { RawData, WebSocket } from "ws";
import { Request } from "express";
import { type BaseMessage, HumanMessage } from "@langchain/core/messages";

import type { CustomLlmResponse, CustomLlmRequest } from "@/types";
import { agent, systemMessage, supabase } from "@/lib";

export default async (ws: WebSocket, req: Request) => {
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

  const res: CustomLlmResponse = {
    response_id: 0,
    response_type: "response",
    content: "hey",
    content_complete: true,
    end_call: false,
  };

  ws.send(JSON.stringify(res));

  ws.on("message", async (data: RawData, isBinary: boolean) => {
    if (isBinary) ws.close(1002, "binary data not supported");

    const request: CustomLlmRequest = JSON.parse(data.toString());

    if (request.interaction_type === "update_only") return;

    if (request.interaction_type === "call_details") {
      state = request.call.metadata;
      return;
    }

    if (request.interaction_type === "ping_pong") {
      const pingpongResponse = {
        response_type: "ping_pong",
        timestamp: request.timestamp,
      };
      ws.send(JSON.stringify(pingpongResponse));
      return;
    }

    const promptVars = {
      assistant_name: state.assistant_name || "Wai",
      caller_name: state.caller.name,
      caller_preferences: JSON.stringify(state.caller.preferences),
    };

    const messages = [
      await systemMessage.format(promptVars),
      new HumanMessage(
        request.transcript[request.transcript.length - 1].content
      ),
    ];

    const options = {
      configurable: {
        thread_id: req.params.id,
        call_id: req.params.id,
        ...state,
      },
      version: "v2" as const,
    };

    try {
      const stream = await agent.streamEvents({ messages }, options);
  
      for await (const { event, data } of stream) {
        if (event === "on_chat_model_stream") {
          const { content } = data.chunk;
  
          if (content) {
            ws.send(
              JSON.stringify({
                response_id: request.response_id,
                content,
                content_complete: false,
                end_call: false,
              })
            );
          }
        }
      }
    } catch (error) {
      console.error("Streaming error: ", error);
    }
  });

  // TODO: update call end time in supabase
  ws.on("close", async (_code) => {
    const { error } = await supabase
      .from("calls")
      .update({
        ended_at: new Date().toISOString(),
      })
      .eq("retell_id", req.params.id);

    if (error) {
      console.error("Error updating call end time: ", error);
    }
  });

  ws.on("error", console.error);
};
