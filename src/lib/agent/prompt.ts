import fs from "node:fs";
import path from "node:path";
import url from "url";

import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { HumanMessage } from "@langchain/core/messages";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const systemTemplate = fs.readFileSync(
  path.resolve(__dirname, "./system.md"),
  "utf8"
);

export const systemMessage =
  SystemMessagePromptTemplate.fromTemplate(systemTemplate);

export const prompt = ChatPromptTemplate.fromMessages([
  systemMessage,
  new MessagesPlaceholder("chat_history"),
  new HumanMessage("input"),
]);
