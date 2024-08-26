import { ToolNode } from "@langchain/langgraph/prebuilt";
import { END, START, StateGraph, Annotation } from "@langchain/langgraph";
import { HumanMessage, BaseMessage } from "@langchain/core/messages";

import { userNameTool } from "./user-name";
import { tavily } from "./search";
import { GraphState } from "../graph-state";

export const tools = [userNameTool, tavily];
export const toolNode = new ToolNode<typeof GraphState.State>(tools);
export const toolsByName = tools.reduce((acc: { [key: string]: any }, tool) => {
  acc[tool.name] = tool;
  return acc;
}, {});
