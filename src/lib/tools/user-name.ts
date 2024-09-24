import { z } from "zod";
import { tool } from "@langchain/core/tools";
import type { RunnableConfig } from "@langchain/core/runnables";

import { callQueue } from "@/jobs";

const schema = z.object({
  name: z.string(),
  message: z
    .string()
    .describe("a message you will say to the user after learning their name"),
});

export const userNameTool = tool(
  async (data, config) => {
    const { name } = data;

    await callQueue.add("upsertCallerName", {
      name,
      ...config?.configurable,
    });

    // TODO: look into returning the queue for inserting values into prompt
    return data;
  },
  {
    name: "userName",
    description: "called when the user names themselves",
    schema,
  }
);
