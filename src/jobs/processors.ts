import { Job } from "bullmq";

export const logger = async (job: Job) => {
  await job.log(
    `Started processing job with id ${job.id} and data ${job.data}`
  );
  await job.updateProgress(100);
  return "DONE";
};
