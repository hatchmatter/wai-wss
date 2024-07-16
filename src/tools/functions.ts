import { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

import { CustomLlmRequest } from "../types";
import { buildResponse, argsToObj } from "../utils";
import type { Database } from "../types/supabase";

const supabase = new SupabaseClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default {
  async saveUserName(
    user: User,
    properties: any,
    ws: WebSocket,
    request: CustomLlmRequest
  ) {
    // Preemptively send the message to the user
    ws.send(JSON.stringify(buildResponse(request, properties.message)));

    try {
      const { data: caller, error } = await supabase
        .from("callers")
        .upsert(
          { user_id: user.id, name: properties.name },
          { onConflict: "user_id, name" }
        )
        .select()
        .single();

      if (error) throw error;

      const { error: associateError } = await supabase
        .from("callers_calls")
        .upsert({
          caller_id: caller.id,
          call_id: properties.callId,
        });

      if (associateError) throw associateError;

      const { error: callError } = await supabase
        .from("calls")
        .update({ current_caller_id: caller.id })
        .eq("id", properties.callId);

      if (callError) throw callError;
    } catch (e) {
      console.error("Error updating user name: ", e);
    }
  },

  async endCall(
    user: any,
    properties: any,
    ws: WebSocket,
    request: CustomLlmRequest
  ) {
    console.log("Ending call");
    ws.send(
      JSON.stringify(buildResponse(request, properties.message, true, true))
    );
  },

  async updatePreferences(
    user: any,
    properties: any,
    ws: WebSocket,
    request: CustomLlmRequest
  ) {
    ws.send(JSON.stringify(buildResponse(request, properties.message)));

    const { data: call, error: callError } = await supabase
      .from("calls")
      .select("current_caller_id")
      .eq("id", properties.callId)
      .single();

    if (callError) {
      console.error(
        "Error getting current_caller_id so cannot update preferences: ",
        callError,
        properties
      );
      return;
    }

    const { data: caller, error } = await supabase
      .from("callers")
      .select("preferences")
      .eq("id", call.current_caller_id)
      .single();

    if (error)
      console.error("Could not get caller's existing preferences: ", error);

    const newPreferences = argsToObj(properties.preferences);
    const existingPreferences: any = caller.preferences || {};
    const preferences = { ...existingPreferences, ...newPreferences };

    const { error: updateError } = await supabase
      .from("callers")
      .update({ preferences })
      .eq("id", call.current_caller_id);

    if (updateError)
      console.error(
        "Could not update caller's preferences: ",
        updateError,
        properties
      );
  },
};
