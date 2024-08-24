import { Worker } from "bullmq";
import { logger } from "./processors";
import { connection } from "./connection";

export const worker = new Worker("chat", logger, { connection });
