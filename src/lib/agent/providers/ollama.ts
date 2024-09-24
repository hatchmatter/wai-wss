import { ChatOllama, ChatOllamaInput } from "@langchain/ollama";

export function createOllama(opts: ChatOllamaInput) {
  return new ChatOllama({
    model: "llama3.1",
    baseUrl: process.env.OLLAMA_URL, // will default to "http://127.0.0.1:11434" if not set
    temperature: 0,
    maxRetries: 2,
    ...opts,
  });
}
