import fs from "node:fs";
import path from "node:path";
import url from "url";

import { ChatPromptTemplate } from "@langchain/core/prompts";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const systemTemplate = fs.readFileSync(
  path.resolve(__dirname, "./system.txt"),
  "utf8"
);

export const prompt = ChatPromptTemplate.fromMessages([
  ["system", systemTemplate],
  ["placeholder", "{chat_history}"],
  ["human", "{input}"],
]);
