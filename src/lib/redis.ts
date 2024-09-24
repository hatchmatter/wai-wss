import IORedis from "ioredis";
import config from "@/config";

const { REDIS_URL } = config;

if (!REDIS_URL) {
  throw new Error("REDIS_URL is not set");
}

export const redis = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});
