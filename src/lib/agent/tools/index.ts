import { ToolNode } from "@langchain/langgraph/prebuilt";
import { StructuredToolInterface } from "@langchain/core/tools";
import { RunnableToolLike } from "@langchain/core/runnables";

import { userNameTool } from "./user-name";
import { storyTool } from "./story";
import { tavily } from "./search";
import { GraphState } from "../graph-state";

export { userNameTool, storyTool, tavily };

export type AnyTool = StructuredToolInterface | RunnableToolLike;

export function createTools(tools: AnyTool[]) {
  return new ToolNode<typeof GraphState.State>(tools);
}
