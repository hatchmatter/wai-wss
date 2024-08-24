import { userNameTool } from "./user-name";

export const tools = [userNameTool];
export const toolsByName = tools.reduce((acc: { [key: string]: any }, tool) => {
  acc[tool.name] = tool;
  return acc;
}, {});
