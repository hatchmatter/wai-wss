import datefns from "date-fns";
import { RawData, WebSocket } from "ws";
import { Request } from "express";
import { SupabaseClient } from "@supabase/supabase-js";

import { RetellRequest } from "../types";
import { createCompletion, preparePrompt } from "../openai";
import { buildResponse } from "../utils";
import { functions } from "../tools";

export default async (ws: WebSocket, req: Request) => {
  const supabase = new SupabaseClient(
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

  // This is the initial greeting to the user. Has nothing to do with OpenAI or an LLM
  // only send greeting if the last call was more than an hour ago
  if (
    lastCall &&
    datefns.differenceInMinutes(new Date(), new Date(lastCall.ended_at)) > 10
  ) {
    const res = {
      response_id: 0,
      content: `hey ${caller.name || "there"}`, // settings?.greeting || DEFAULT_GREETING,
      content_complete: true,
      end_call: false,
    };

    ws.send(JSON.stringify(res));
  } else {
    const res = {
      response_id: 0,
      content: "",
      content_complete: true,
      end_call: false,
    };

    ws.send(JSON.stringify(res));
  }

  ws.on("error", (err) => {
    console.error("Error received in LLM websocket client: ", err);
  });

  ws.on("close", async (err) => {
    await supabase
      .from("calls")
      .update({ ended_at: new Date() })
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
        caller?.name
      );
      const completions = await createCompletion(prompt);
      const functionToCall = {
        name: "",
        arguments: "",
      };

      for await (const completion of completions) {
        if (completion.choices.length >= 1) {
          const delta = completion.choices[0].delta;

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
        args.callerId = caller?.id;

        functions[functionToCall.name](ws, request, args, user);

        await supabase.from('functions').insert({
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
