import { ToolNode } from "@langchain/langgraph/prebuilt";

import { userNameTool } from "./user-name";
import { storyTool } from "./story";
import { tavily } from "./search";
import { GraphState } from "../graph-state";

const tools = [userNameTool, storyTool, tavily];
export const toolNode = new ToolNode<typeof GraphState.State>(tools);
