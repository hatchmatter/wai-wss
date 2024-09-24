import { MemorySaver } from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";
import { ChatOpenAI } from "@langchain/openai";
import { RedisSaver } from "checkpoint-redis";
import { AnyTool } from "./tools";

export type OpenAiModels = "gpt-4o" | "gpt-3.5-turbo";
export type OllamaModels = "llama3.1";
export type Provider = ChatOllama | ChatOpenAI;
export type Checkpointer = MemorySaver | RedisSaver;

export type AgentOptions = {
  provider: "openai" | "ollama";
  model: OpenAiModels | OllamaModels;
  checkpointer?: "memory" | "redis";
  tools?: AnyTool[];
};