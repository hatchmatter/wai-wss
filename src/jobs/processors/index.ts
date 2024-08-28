import { Job } from "bullmq";
import { upsertCallerName } from "./upsert-caller-name";

interface Processors {
  [key: string]: (job: Job) => Promise<any>;
}

export const processors: Processors = {
  upsertCallerName,
};
