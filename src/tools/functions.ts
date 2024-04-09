import { SupabaseClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import { RetellRequest } from "../types";
import type { Database } from "../types/supabase";
import { buildResponse } from "../utils";

const supabase = new SupabaseClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default {
  async updateCallerName(
    ws: WebSocket,
    request: RetellRequest,
    properties: any,
    user: any
  ) {
    const { data: caller, error } = await supabase
      .from("callers")
      .upsert(
        { user_id: user.id, name: properties.name },
        { onConflict: "user_id, name" }
      )
      .select()
      .single();

    if (error) {
      console.error("Error updating caller: ", error);
      return;
    }

    const { error: associateError } = await supabase
      .from("callers_calls")
      .upsert({
        caller_id: caller.id,
        call_id: properties.callId,
      });

    if (associateError) {
      console.error("Error associating callers_calls: ", associateError);
      return;
    }

    const { error: callError } = await supabase
      .from("calls")
      .update({ current_caller_id: caller.id })
      .eq("id", properties.callId);

    if (callError) {
      console.error("Error updating call: ", callError);
      return;
    }

    const response = buildResponse(request, properties.message);
    ws.send(JSON.stringify(response));
  },

  async endCall(
    ws: WebSocket,
    request: RetellRequest,
    properties: any,
    user: any
  ) {
    const { error } = await supabase
      .from("calls")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", properties.callId);

    if (error) {
      console.error("Error updating call end time: ", error);
    }

    const response = buildResponse(request, properties.message, true, true);
    ws.send(JSON.stringify(response));
  },

  // getCurrentDateTime(
  //   ws: WebSocket,
  //   request: RetellRequest,
  //   properties: any,
  //   user: any
  // ) {
  //   const type = properties.type;
  //   let now = new Date();

  //   if (properties.timezone) {
  //     now = new Date(
  //       now.toLocaleString("en-US", { timeZone: properties.timezone })
  //     );
  //   }

  //   let message = "";
  //   if (type === "date") {
  //     message = format(now, "EEEE, MMMM d, yyyy");
  //   } else if (type === "time") {
  //     message = format(now, "h:mm a");
  //   } else if (type === "date_time") {
  //     message = format(now, "EEEE, MMMM d, yyyy 'at' h:mm a");
  //   } else if (type === "day") {
  //     message = format(now, "EEEE");
  //   } else {
  //     message = "unknown";
  //   }

  //   if (properties.message) {
  //     message = `${properties.message} ${message}`;
  //   }

  //   const response = buildResponse(request, message);
  //   ws.send(JSON.stringify(response));
  // },
  async updatePreferences(
    ws: WebSocket,
    request: RetellRequest,
    properties: any,
    user: any
  ) {
    // If it's the caller's first call, we need to get the current_caller_id from the call
    // as it won't be passed in the properties.
    const query = supabase
      .from("calls")
      .select("current_caller_id")
      .eq("id", properties.callId)
      .single();
    let callerId = properties.callerId;

    if (!callerId) {
      const { data, error } = await query;

      if (error) {
        console.error("Error getting call: ", error);
        return;
      }

      callerId = data.current_caller_id;
    }

    const { data: caller, error } = await supabase
      .from("callers")
      .select("preferences")
      .eq("id", callerId)
      .single();

    if (error) {
      console.error("Error updating preferences: ", error);
      return;
    }

    // Wrapped in a try/catch block because sometimes the properties.preferences are not valid JSON
    // and we don't want to crash, just catch and move on. Not a big deal.
    // TODO: Add a check for valid JSON and try to fix it if it's not.
    try {
      const newPreferences = JSON.parse(properties.preferences);
      const existingPreferences: {} = caller.preferences || {};
      const preferences = { ...existingPreferences, ...newPreferences };

      const { error: updateError } = await supabase
        .from("callers")
        .update({ preferences })
        .eq("id", callerId);

      if (updateError) {
        console.error(updateError);
      }
    } catch (e) {
      console.error(e);
    }

    const response = buildResponse(request, properties.message);
    ws.send(JSON.stringify(response));
  },
};
