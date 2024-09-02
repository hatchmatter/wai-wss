import { END, START, StateGraph, MemorySaver } from "@langchain/langgraph";
import { AIMessage } from "@langchain/core/messages";

import { llm } from "./openai";
import { toolNode } from "./tools";

import { GraphState } from "./graph-state";

const graph = new StateGraph(GraphState)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addConditionalEdges("agent", routeMessage)
  .addEdge("tools", "agent")
  .addEdge(START, "agent");

// TODO: this should be done with redis and not in memory
const checkpointer = new MemorySaver();

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
