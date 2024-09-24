import { AIMessage } from "@langchain/core/messages";
import { END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";

import { GraphState } from "./graph-state";
import { Provider } from "./types";

export function callModel(provider: Provider, toolNode: ToolNode) {
  return async function (state: typeof GraphState.State) {
    const { messages } = state;
    const model = provider.bindTools(toolNode.tools); // force tool with: , {tool_choice: "[TOOL_NAME]"}

    try {
      const response = await model.invoke(messages);

      return { messages: [response] };
    } catch (error) {
      console.error(error);
    }
  };
}

export function routeMessage(state: typeof GraphState.State) {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1] as AIMessage;

  if (!lastMessage?.tool_calls?.length) {
    return END;
  }

  return "tools";
}
