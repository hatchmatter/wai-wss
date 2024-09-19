import { ChatOllama } from "@langchain/ollama";

export const llm = new ChatOllama({
  model: "llama3.1",
  baseUrl: "http://host.docker.internal:11434",
  temperature: 0,
  maxRetries: 2,
});
