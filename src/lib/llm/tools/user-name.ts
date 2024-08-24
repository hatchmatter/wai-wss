import { z } from "zod";
import { tool } from "@langchain/core/tools";

const schema = z.object({
  name: z.string(),
  message: z
    .string()
    .describe("a message you will say to the user after learning their name"),
});

export const userNameTool = tool(
  async (data) => {
    return data;
  },
  {
    name: "userName",
    description: "called when the user names themselves",
    schema,
  }
);
