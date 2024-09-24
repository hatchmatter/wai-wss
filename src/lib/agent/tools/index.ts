import { ToolNode } from "@langchain/langgraph/prebuilt";
import { StructuredToolInterface } from "@langchain/core/tools";
import { RunnableToolLike } from "@langchain/core/runnables";

import { tavily } from "./tavily";
import { GraphState } from "../graph-state";

export { tavily };

export type AnyTool = StructuredToolInterface | RunnableToolLike;

export function createTools(tools: AnyTool[]) {
  return new ToolNode<typeof GraphState.State>(tools);
}
