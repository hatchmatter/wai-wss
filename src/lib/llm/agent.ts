import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { RedisChatMessageHistory } from "@langchain/redis";

import { llm } from './openai';
import { prompt } from './prompt';
import { tools } from './tools';

const llmWithTools = llm.bindTools(tools);
const runnable = prompt.pipe(llmWithTools);

export const runnableWithMessageHistory = new RunnableWithMessageHistory({
  runnable,
  getMessageHistory: async (sessionId) => new RedisChatMessageHistory({
    sessionId,
    config: {
      url: process.env.REDIS_URL,
    },
  }),
  inputMessagesKey: "input",
  historyMessagesKey: "chat_history",
});