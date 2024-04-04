import datefns from "date-fns";
import { RawData, WebSocket } from "ws";
import { Request } from "express";
import { SupabaseClient } from "@supabase/supabase-js";

import { RetellRequest } from "../types";
import type { Database } from "../types/supabase";
import { createCompletion, preparePrompt } from "../openai";
import { buildResponse } from "../utils";
import { functions } from "../tools";

export default async (ws: WebSocket, req: Request) => {
  const supabase = new SupabaseClient<Database>(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: call } = await supabase
    .from("calls")
    .select("*")
    .eq("retell_id", req.params.id)
    .single();
  const { data: lastCall } = await supabase
    .from("calls")
    .select("*")
    .eq("user_id", call.user_id)
    .not("current_caller_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  const {
    data: { user },
  } = await supabase.auth.admin.getUserById(call.user_id);
  const { data: settings } = await supabase
    .from("settings")
    .select("*")
    .eq("id", user.id)
    .single();
  const { data: caller } = await supabase
    .from("callers")
    .select("*")
    .eq("id", lastCall?.current_caller_id)
    .single();
  const { data: callers } = await supabase
    .from("callers")
    .select("name")
    .eq("user_id", user.id);

  const greeting = initialGreeting(settings, caller, lastCall);

  ws.send(JSON.stringify(greeting));

  ws.on("error", (err) => {
    console.error("Error received in LLM websocket client: ", err);
  });

  ws.on("close", async (err) => {
    const { data: call } = await supabase
      .from("calls")
      .select("id, current_caller_id")
      .eq("retell_id", req.params.id)
      .single();
    await supabase
      .from("calls")
      .update({
        ended_at: new Date().toISOString(),
        current_caller_id: call.current_caller_id ?? caller?.id,
      })
      .eq("id", call.id);
  });

  ws.on("message", async (data: RawData, isBinary: boolean) => {
    if (isBinary) {
      console.error("Got binary message instead of text in websocket.");
      ws.close(1002, "Cannot find corresponding Retell LLM.");
    }

    try {
      const request: RetellRequest = JSON.parse(data.toString());

      if (request.interaction_type === "update_only") {
        // process live transcript update if needed
        return;
      }

      const prompt = preparePrompt(
        request,
        settings?.assistant_name || "Wai",
        caller,
        callers
      );
      const completions = await createCompletion(prompt);
      const functionToCall = {
        name: "",
        arguments: "",
      };

      for await (const completion of completions) {
        if (completion.choices.length >= 1) {
          const { delta } = completion.choices[0];

          if (delta.tool_calls) {
            const tool_call = delta.tool_calls[0];

            if (tool_call.function.name) {
              functionToCall.name = tool_call.function.name;
            }

            functionToCall.arguments += tool_call.function.arguments;
          }

          if (delta.content) {
            const res = buildResponse(request, delta.content, false);

            ws.send(JSON.stringify(res));
          }
        }
      }

      if (functionToCall.name) {
        const args = JSON.parse(functionToCall.arguments);
        args.callId = call.id;
        args.timezone = call.timezone;
        args.callerId = caller?.id;

        functions[functionToCall.name](ws, request, args, user);

        await supabase.from("functions").insert({
          name: functionToCall.name,
          args,
          call_id: call.id,
        });
      }
    } catch (err) {
      console.error("Error in parsing LLM websocket message: ", err);
      ws.close(1002, "Cannot parse incoming message.");
    }
  });
};

function initialGreeting(settings: any, caller: any, lastCall: any) {
  let res;
  // This is the initial greeting to the user. Has nothing to do with OpenAI or an LLM
  // If they are a new caller, or if calls have never been stored in the database, greet them generically
  if (!lastCall) {
    res = {
      response_id: 0,
      content: `Hey there! I'm ${
        settings?.assistant_name || "Wai"
      }. What's your name?`,
      content_complete: true,
      end_call: false,
    };
    // If Wai hasn't spoken to the user in 10 minutes, greet them
  } else if (
    datefns.differenceInMinutes(new Date(), new Date(lastCall.ended_at)) > 10 ||
    process.env.MODE === "debug"
  ) {
    res = {
      response_id: 0,
      content: `hey ${caller?.name || "there"}`, // it's possible we still don't know their name due to ASR errors or other issues
      content_complete: true,
      end_call: false,
    };
    // Otherwise, Wai just talked to them so we don't need to greet them again
  } else {
    res = {
      response_id: 0,
      content: "",
      content_complete: true,
      end_call: false,
    };
  }

  return res;
}
