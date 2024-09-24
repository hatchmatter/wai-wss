import { RawData, WebSocket } from "ws";
import { Request } from "express";
import fs from "fs";
import path from "path";
import url from "url";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

import type { CustomLlmResponse, CustomLlmRequest, CallDetails } from "@/types";
import { createAgent, createSystemMessage } from "@/lib/agent";
import { tavily } from "@/lib/agent/tools";
import { getEventChunks } from "@/lib/agent/utils";

import { userNameTool, storyTool } from "@/lib/tools";
import { supabase } from "@/lib/supabase";
import config from "@/config";

const { NODE_ENV, provider, model, checkpointer } = config;

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const systemTemplate = fs.readFileSync(
  path.resolve(__dirname, "../system-message-template.md"),
  "utf8"
);

const agent = createAgent({
  provider,
  checkpointer,
  model,
  tools:
    NODE_ENV === "production" ? [userNameTool, storyTool, tavily] : undefined,
});

// TODO: fetch most recent checkpoint/call metadata from db and load into redis
export default async (ws: WebSocket, req: Request) => {
  let metadata: CallDetails["metadata"];
  let systemMessage: SystemMessage;
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
      metadata = request.call.metadata;
      systemMessage = await createSystemMessage({
        systemMessageTemplate: systemTemplate,
        promptVars: {
          assistant_name: metadata.assistant_name,
          caller_name: metadata.caller?.name ?? "",
          caller_preferences: JSON.stringify(
            metadata.caller?.preferences ?? {}
          ),
        },
      });

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

    const messages = [
      systemMessage,
      new HumanMessage(
        request.transcript[request.transcript.length - 1].content
      ),
    ];

    const options = {
      configurable: {
        thread_id: metadata.user.id,
        // call_id and ...metadata are used in tools
        call_id: req.params.id,
        ...metadata,
      },
      version: "v2" as const,
    };

    try {
      const stream = agent.streamEvents({ messages }, options);
      const chunks = getEventChunks(stream, "on_chat_model_stream");

      for await (const chunk of chunks) {
        ws.send(
          JSON.stringify({
            response_id: request.response_id,
            content: chunk.content,
            content_complete: false,
            end_call: false,
          })
        );
      }
    } catch (error) {
      console.error("Streaming chat completion error: ", error);
    }
  });

  // TODO: flush redis and update db with most recent checkpoint/call metadata to minimize redis memory usage
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
