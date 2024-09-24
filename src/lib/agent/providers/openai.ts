import { ChatOpenAI, ChatOpenAIFields } from "@langchain/openai";

export function createOpenAi(opts: ChatOpenAIFields) {
  return new ChatOpenAI({
    model: "gpt-4o",
    temperature: 0,
    ...opts,
  });
}

export { ChatOpenAI };
