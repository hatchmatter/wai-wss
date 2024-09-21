import { START, StateGraph } from "@langchain/langgraph";
import IORedis from "ioredis";
import { RedisSaver } from "checkpoint-redis";
import { MemorySaver } from "@langchain/langgraph";

import { createOllama } from "./providers/ollama";
import { createOpenAi } from "./providers/openai";
import { createTools } from "./tools";
import { GraphState } from "./graph-state";
import { callModel, routeMessage } from "./handlers";
import { AgentOptions, Provider, Checkpointer } from "./types";

export function createAgent(opts: AgentOptions) {
  let checkpointer: Checkpointer = new MemorySaver();
  let provider: Provider;

  if (!opts.provider)
    throw new Error("You must set provider to be either 'openai' or 'ollama'");

  if (!opts.model)
    throw new Error("You must set a model for the provider");

  if (opts.provider === "openai") {
    provider = createOpenAi({ model: opts.model });
  }

  if (opts.provider === "ollama") {
    provider = createOllama({ model: opts.model });
  }

  if (opts.checkpointer === "redis") {
    const connection = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });

    checkpointer = new RedisSaver({ connection });
  }

  const toolNode = createTools(opts.tools || []);
  const graph = new StateGraph(GraphState)
    .addNode("agent", callModel(provider, toolNode))
    .addNode("tools", toolNode)
    .addConditionalEdges("agent", routeMessage)
    .addEdge("tools", "agent")
    .addEdge(START, "agent");

  return graph.compile({ checkpointer });
}

