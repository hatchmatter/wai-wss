import { END, START, StateGraph } from "@langchain/langgraph";
import { AIMessage } from "@langchain/core/messages";
import IORedis from "ioredis";
import { RedisSaver } from "checkpoint-redis";

import { llm as ollama } from "./ollama";
import { llm as openai } from "./openai";
import { toolNode } from "./tools";
import { GraphState } from "./graph-state";

const llm = process.env.NODE_ENV === "development" ? ollama : openai;

const graph = new StateGraph(GraphState)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addConditionalEdges("agent", routeMessage)
  .addEdge("tools", "agent")
  .addEdge(START, "agent");

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});
const checkpointer = new RedisSaver({ connection });

export const agent = graph.compile({ checkpointer });

// --------------------------------------------
function routeMessage(state: typeof GraphState.State) {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1] as AIMessage;

  if (!lastMessage?.tool_calls?.length) {
    return END;
  }

  return "tools";
}

async function callModel(state: typeof GraphState.State) {
  const { messages } = state;
  const model = llm.bindTools(toolNode.tools); // force story with: , {tool_choice: "story"}

  try {
    const response = await model.invoke(messages);

    return { messages: [response] };
  } catch (error) {
    console.error(error);
  }
}
