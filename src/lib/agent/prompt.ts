import fs from "node:fs";
import path from "node:path";
import url from "url";

import {
  SystemMessagePromptTemplate,
} from "@langchain/core/prompts";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultSystemTemplate = fs.readFileSync(
  path.resolve(__dirname, "./system-message-template.md"),
  "utf8"
);

type CreateSystemMessageOpts = {
  systemMessageTemplate?: string;
  promptVars?: Record<string, string>;
};

export async function createSystemMessage(opts: CreateSystemMessageOpts) {
  const { systemMessageTemplate, promptVars } = opts;

  const systemMessage = SystemMessagePromptTemplate.fromTemplate(
    systemMessageTemplate ?? defaultSystemTemplate
  );

  return systemMessage.format(promptVars ?? {});
}
