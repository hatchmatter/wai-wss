import { z } from "zod";
import { tool } from "@langchain/core/tools";

/**
 * This is a placeholder for the story tool. It's possible there's a better
 * way to do this using a dedicated agent that handles storytelling and generating images.
 * NOTE: the llm doesn't want to run this for some reason.
 */
const schema = z.object({
  name: z.string().describe("the name of the story"),
  sections: z
    .array(z.string())
    .describe("an imaginitive description for each section of the story"),
  story: z
    .string()
    .describe("the story you will tell"),
});

export const storyTool = tool(
  async (data, _config) => {
    return data;
  },
  {
    name: "story",
    description: "called when the user requests a story",
    schema,
  }
);
