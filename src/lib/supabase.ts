import { createClient } from "@supabase/supabase-js";
import config from "@/config";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = config;

if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL is not set");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
}

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);
