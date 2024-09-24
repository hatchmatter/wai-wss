export type Config = Record<string, any>;

export const base: Config = {
  // Third Party Environment variables
  OPENAI_ORGANIZATION_ID: process.env.OPENAI_ORGANIZATION_ID,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,

  RETELL_API_KEY: process.env.RETELL_API_KEY,

  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,

  LANGCHAIN_TRACING_V2: process.env.LANGCHAIN_TRACING_V2,
  LANGCHAIN_ENDPOINT: process.env.LANGCHAIN_ENDPOINT,
  LANGCHAIN_API_KEY: process.env.LANGCHAIN_API_KEY,
  LANGCHAIN_PROJECT: process.env.LANGCHAIN_PROJECT,
  LANGCHAIN_CALLBACKS_BACKGROUND: process.env.LANGCHAIN_CALLBACKS_BACKGROUND,

  TAVILY_API_KEY: process.env.TAVILY_API_KEY,

  REDIS_URL: process.env.REDIS_URL,
  OLLAMA_URL: process.env.OLLAMA_URL,

  // Application Environment variables
  NODE_ENV: process.env.NODE_ENV,
  MODE: process.env.MODE,

  checkpointer: "redis", // "redis" or "memory"
};
