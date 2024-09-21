import { RawData, WebSocket } from "ws";
import { Request } from "express";
import fs from "fs";
import path from "path";
import url from "url";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

import type { CustomLlmResponse, CustomLlmRequest } from "@/types";
import { createAgent, createSystemMessage } from "@/lib/agent";
import { storyTool, tavily, userNameTool } from "@/lib/agent/tools";
import { getEventChunks } from "@/lib/agent/utils";
import { supabase } from "@/lib/supabase";
import { config } from "@/config";

const { env } = config;

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const systemTemplate = fs.readFileSync(
  path.resolve(__dirname, "../system-message-template.md"),
  "utf8"
);

type CallState = {
  user: {
    id: string;
  };
  assistant_name?: string;
  caller?: {
    name: string;
    preferences: Record<string, any>;
  };
};

const agent = createAgent({
  provider: env === "development" ? "ollama" : "openai",
  checkpointer: "redis",
  model: "llama3.1",
  tools: env === "production" && [userNameTool, storyTool, tavily],
});

// TODO: fetch most recent checkpoint/call state from db and load into redis
export default async (ws: WebSocket, req: Request) => {
  let state: CallState;
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
      state = request.call.metadata;
      systemMessage = await createSystemMessage({
        systemMessageTemplate: systemTemplate,
        promptVars: {
          assistant_name: state.assistant_name,
          caller_name: state.caller?.name ?? "",
          caller_preferences: JSON.stringify(state.caller?.preferences ?? {}),
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
        thread_id: state.user.id,
        // call_id and ...state are used in tools
        call_id: req.params.id,
        ...state,
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

  // TODO: flush redis and update db with most recent checkpoint/call state to minimize redis memory usage
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


