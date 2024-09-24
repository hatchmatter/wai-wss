import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { ConsoleCallbackHandler } from "@langchain/core/tracers/console";

export const tavily = new TavilySearchResults({
  maxResults: 3,
  callbacks: [new ConsoleCallbackHandler()],
});
