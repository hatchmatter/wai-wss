import { Job } from "bullmq";
import { supabase } from "@/lib";

export const upsertCallerName = async (job: Job) => {
  await job.log(
    `Started processing job with id ${job.id} and data ${job.data}`
  );

  const { name, user, call_id } = job.data;

  try {
    const { data: caller, error } = await supabase
      .from("callers")
      .upsert(
        { user_id: user.id, name: name },
        { onConflict: "user_id, name" }
      )
      .select()
      .single();

    if (error) throw error;

    job.updateProgress(50);

    const { data: call, error: callError } = await supabase
      .from("calls")
      .update({ current_caller_id: caller.id })
      .eq("retell_id", call_id)
      .select()
      .single();

    if (callError) throw callError;

    await job.updateProgress(75);

    const { error: associateError } = await supabase
      .from("callers_calls")
      .upsert({
        caller_id: caller.id,
        call_id: call.id,
      });

    if (associateError) throw associateError;

    await job.updateProgress(100);

    return caller;
  } catch (e) {
    console.error("Error upserting caller name: ", e);
  }
};