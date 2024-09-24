import { Worker } from "bullmq";
import { processors } from "./processors";
import { redis } from "@/lib/redis";

new Worker(
  "call",
  async (job) => {
    const processor = processors[job.name];

    if (!processor) {
      throw new Error(`No processor found for job: ${job.name}`);
    }

    return processor(job);
  },
  {
    connection: redis,
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  }
);
