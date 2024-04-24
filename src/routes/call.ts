import datefns from "date-fns";
import { RawData, WebSocket } from "ws";
import { Request } from "express";
import { SupabaseClient } from "@supabase/supabase-js";

import { RetellRequest } from "../types";
import type { Database } from "../types/supabase";
import { createStreamingCompletion, preparePrompt } from "../openai";
import { buildResponse, argsToObj } from "../utils";
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

  const {
    data: { user },
  } = await supabase.auth.admin.getUserById(call.user_id);

  const { data: settings } = await supabase
    .from("settings")
    .select("*")
    .eq("id", user.id)
    .single();

  // all callers for this user. for setting up prompt to remember previous callers
  const { data: callers } = await supabase
    .from("callers")
    .select("name")
    .eq("user_id", user.id);

  // last call with a caller
  const { data: lastCall } = await supabase
    .from("calls")
    .select("*")
    .eq("user_id", call.user_id)
    .not("current_caller_id", "is", null)
    .order("ended_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // all calls that have a caller and a transcript for this user
  const { data: calls } = await supabase
    .from("calls")
    .select("transcript, transcript_text, summary, created_at")
    .eq("user_id", call.user_id)
    .eq("current_caller_id", lastCall?.current_caller_id)
    .order("created_at", { ascending: true });

  const { data: caller } = await supabase
    .from("callers")
    .select("*")
    .eq("id", lastCall?.current_caller_id)
    .single();

  // associate the call with the caller.
  // TODO: this should be done in the FE before the call is initiated
  if (caller?.id) {
    await supabase
      .from("calls")
      .update({
        current_caller_id: caller?.id,
      })
      .eq("id", call.id);

    await supabase.from("callers_calls").upsert({
      caller_id: caller.id,
      call_id: call.id,
    });
  }

  const greeting = initialGreeting(settings, caller, lastCall);

  ws.send(JSON.stringify(greeting));

  ws.on("error", (err) => {
    console.error("Error received in LLM websocket client: ", err);
  });

  ws.on("close", async (err) => {
    try {
      // we need to fetch the call again in case the caller changed during the call
      const { data: _call, error } = await supabase
        .from("calls")
        .select("id, current_caller_id")
        .eq("id", call.id)
        .single();

      if (error) throw error;

      const { error: updateCallError } = await supabase
        .from("calls")
        .update({
          ended_at: new Date().toISOString(),
        })
        .eq("id", _call.id);

      if (updateCallError) throw updateCallError;
    } catch (e) {
      console.error("Error updating call after closing", e);
    }
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

      const formattedTranscripts = calls
        ?.map(formatTranscript)
        .filter(Boolean)
        .join("\n");

      const prompt = preparePrompt(
        request,
        settings?.assistant_name || "Wai",
        caller,
        callers,
        formattedTranscripts,
        call.timezone
      );

      const stream = await createStreamingCompletion(prompt);

      let fnName;
      let fnArgs: string[] = [];

      for await (const completionChunk of stream) {
        if (completionChunk.choices.length >= 1) {
          const { delta } = completionChunk.choices[0];

          if (delta.tool_calls) {
            const tool_call = delta.tool_calls[0];

            if (tool_call.function.name) {
              fnName = tool_call.function.name;
            }

            fnArgs.push(tool_call.function.arguments);
          }

          if (delta.content) {
            ws.send(
              JSON.stringify(buildResponse(request, delta.content, false))
            );
          }
        }
      }

      if (fnName) {
        const args: any = {
          callId: call.id,
          timezone: call.timezone,
          callerId: caller?.id,
          ...argsToObj([...fnArgs].join("")), // the array has to be cloned
        };

        fnArgs = []; // reset the arguments

        const fn = functions[fnName];

        fn(user, args, ws, request);

        const { error } = await supabase.from("functions").insert({
          name: fnName,
          args,
          call_id: call.id,
        });

        if (error) console.error("Error in saving function: ", error);
      }
    } catch (err) {
      console.error("Error in parsing LLM websocket message: ", err);
      ws.close(1002, "Cannot parse incoming message.");
    }
  });
};

function formatTranscript(call, i) {
  const { transcript, transcript_text, summary } = call;
  let formatted: string;
  const callNum = i;
  const callDate = datefns.format(
    new Date(call.created_at),
    "EEEE, MMMM d, yyyy 'at' h:mm a"
  );
  const difference = datefns.differenceInDays(
    new Date(),
    new Date(call.created_at)
  );

  // If the call happened a while ago then the AI's memory should fade.
  if (summary && difference > 7) {
    return `
      Call: #${callNum}
      Took place at: ${callDate}
      Summary: ${summary}`;
  }

  // Prefer transcript text for now.
  if (transcript_text) {
    formatted = transcript_text;
  } else {
    formatted = transcript
      ?.map((t) => {
        if (t.content.length < 10) {
          return null;
        }

        return `${t.role}: ${t.content}\n`;
      })
      .filter(Boolean)
      .join("");
  }

  if (!formatted || !formatted.toLowerCase().match(/user:/)) {
    return null;
  }

  return `
    Call: #${i}
    Took place at: ${callDate}
    Transcript:\n ${formatted}`;
}

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
