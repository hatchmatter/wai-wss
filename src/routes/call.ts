import datefns from "date-fns";
import { RawData, WebSocket } from "ws";
import { Request } from "express";
import { SupabaseClient } from "@supabase/supabase-js";

import { CustomLlmRequest, CustomLlmResponse } from "../types";
import type { Database } from "../types/supabase";
import { createStreamingCompletion, preparePrompt, createImagePrompt, createImageCompletion } from "../openai";
import { buildResponse, argsToObj } from "../utils";
import { functions } from "../tools";

let isStoryMode = false;
let storyTranscript = [];
// let capturingStory = false;

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

//   const prompt1 = `**Illustration Prompt:**

// **Scene Description:**
// Harry the penguin is standing in the middle of a whimsical forest, looking around with a mix of curiosity and concern. The forest is lush and vibrant, filled with tall, soft-edged trees with rounded leaves in various shades of green and gold. The ground is covered in a carpet of soft, mossy greens and dotted with colorful, cartoonish flowers in pinks, purples, and yellows. Sunlight filters through the canopy, casting gentle, dappled shadows on the forest floor. The atmosphere is serene yet slightly mysterious, with a sense of adventure in the air.

// **Character Description:**
// - **Harry the Penguin:**
//   - **Appearance:** Harry is a small, adorable penguin with a slightly cartoonish appearance. He has a rounded body, soft edges, and expressive features. His feathers are a bright, cheerful black with a white belly, and his beak and feet are a vibrant orange. Harry's eyes are large and expressive, showing his mix of curiosity and concern. He wears a small, colorful scarf around his neck, adding a touch of whimsy to his appearance.
//   - **Pose and Expression:** Harry stands on a patch of soft moss, looking around with wide eyes. His flippers are slightly raised, as if he is trying to get his bearings. His expression is a mix of wonder and worry, capturing his feelings of being lost but also intrigued by his surroundings.

// **Background and Setting:**
// - **Trees and Foliage:** The trees are tall and majestic, with thick trunks and sprawling branches covered in green leaves. Some trees have vines hanging from them, adding to the forest's dense and wild appearance. The forest floor is covered in a mix of moss, fallen leaves, and small plants.
// - **Lighting:** Sunlight filters through the tree canopy, creating patches of light and shadow on the ground. The light has a warm, golden hue, giving the scene a magical and inviting feel.
// - **Additional Elements:** Small woodland creatures, such as squirrels, rabbits, and birds, can be seen in the background, adding life and movement to the scene. These animals are curious but keep a respectful distance from Harry. A small, winding path can be seen leading deeper into the forest, hinting at the journey ahead.

// **Consistency Details:**
// - **Ensure Harry’s design matches the defined character description with the same rounded body, expressive features, and colorful scarf.**
// - **Maintain the whimsical and imaginative feel with soft-edged trees, vibrant colors, and gentle shading throughout the scene.**
// - **Apply the common art style guidelines, line work, shading, and color palette to this illustration.**
// `;
// const prompt2 = `**Illustration Prompt:**

// **Scene Description:**
// A whimsical forest scene featuring a large, soft-edged tree with rounded leaves in various shades of green and gold. On the tree trunk, a large, colorful mushroom is growing. The forest is lush and vibrant, with the ground covered in a carpet of soft, mossy greens and dotted with colorful, cartoonish flowers in pinks, purples, and yellows. Sunlight filters through the canopy, casting gentle, dappled shadows on the forest floor and the tree trunk. The atmosphere is serene and magical, with a sense of wonder in the air.

// **Mushroom Description:**
// - **Appearance:** The mushroom has a large, round cap with soft edges and a vibrant, cartoonish color scheme. The cap is bright red with white spots, creating a striking contrast against the green and gold of the forest. The stem is thick and slightly textured, with a soft, creamy color.
// - **Placement:** The mushroom grows on the side of the tree trunk, about halfway up, with its cap tilted slightly upwards as if basking in the sunlight. The base of the mushroom is surrounded by small, colorful flowers and soft moss.

// **Background and Setting:**
// - **Trees and Foliage:** The trees are tall and majestic, with thick trunks and sprawling branches covered in green leaves. Some trees have vines hanging from them, adding to the forest's dense and wild appearance. The forest floor is covered in a mix of moss, fallen leaves, and small plants.
// - **Lighting:** Sunlight filters through the tree canopy, creating patches of light and shadow on the ground and the tree trunk. The light has a warm, golden hue, giving the scene a magical and inviting feel.
// - **Additional Elements:** Small woodland creatures, such as squirrels, rabbits, and birds, can be seen in the background, adding life and movement to the scene. These animals are curious and add to the whimsical feel of the illustration.

// **Consistency Details:**
// - **Ensure the mushroom and the tree trunk adhere to the whimsical and imaginative feel with soft-edged lines and vibrant colors.**
// - **Maintain the consistent art style with soft, rounded lines, gentle shading, and the defined color palette.**
// - **Apply the common art style guidelines, line work, shading, and color palette to this illustration.**
// `;
  // const prompt1 = await createImagePrompt(true, "A penguin named harry is lost in the forest far away from home.");
  // console.log(await createImageCompletion(prompt1));
  // const prompt2 = await createImagePrompt(false, "Harry found himself standing in front of a beautiful pond", "A penguin named harry is lost in the forest far away from home.", prompt1);
  // console.log(await createImageCompletion(prompt2));
  //console.log(await createImageCompletion("Create a charming illustration in a children's book style. The image should have a whimsical and imaginative feel, with bright and cheerful colors, a hand-drawn, slightly cartoonish look, soft edges, and gentle shading. The scene should be warm and inviting, full of detail and character. Please illustrate: a penguin lost in a forest"));
  //console.log(await createImageCompletion("Create a charming illustration in a children's book style. The image should have a whimsical and imaginative feel, with bright and cheerful colors, a hand-drawn, slightly cartoonish look, soft edges, and gentle shading. The scene should be warm and inviting, full of detail and character. Previously: a penguin lost in a forest. Now please illustrate a single scene where: the penguin stumbles upon a friendly tree. The style should be consistent with the previous image, maintaining the same color palette, line work, and overall aesthetic. "));
  const story = [
    "Once upon a time, in a lush green forest filled with tall trees and colorful flowers, there lived a curious little porcupine named Poppy. Poppy was not like other porcupines; she had an adventurous spirit and loved exploring every nook and cranny of the forest.",
    "One sunny morning, Poppy decided it was the perfect day for an adventure. She packed her favorite snacks, a map of the forest she had drawn herself, and set out to find the legendary Crystal Cave that was said to sparkle with all the colors of the rainbow.",
    "As she waddled through the forest, Poppy met various animals who warned her about the challenges ahead. 'The path is tricky,' said Oliver Owl. 'And you must solve riddles,' chirped Ruby Robin. But Poppy wasn't deterred; if anything, their warnings made her even more determined.",
    "After hours of trekking through thick bushes and over mossy logs, Poppy arrived at a clearing where sunlight danced on what appeared to be...a cave entrance! It was hidden behind some thorny bushes but sparkled enticingly in the light.",
    "Just as Ruby Robin had warned, guarding the entrance was Gideon Guardhog, keeper of riddles. 'To enter,' Gideon announced in his deep voice, 'you must answer my riddle.'",
    "Poppy listened intently as Gideon posed his challenge: 'I speak without a mouth and hear without ears. I have no body but come alive with wind. What am I?'"
  ];

  // let backstory = "";
  // let prompt = "";
  // let pastPrompt = "";
  // for (let i = 0; i < story.length; i++)
  // {
  //   prompt = await createImagePrompt(i === 0, story[i], backstory, pastPrompt);
  //   console.log(await createImageCompletion(prompt));
  //   pastPrompt = prompt;
  //   backstory += story[i];
  // }
  // console.log(await createImageCompletion("Once upon a time, in a lush green forest filled with tall trees and colorful flowers, there lived a curious little porcupine named Poppy. Poppy was not like other porcupines; she had an adventurous spirit and loved exploring every nook and cranny of the forest."));
  // console.log(await createImageCompletion("One sunny morning, Poppy decided it was the perfect day for an adventure. She packed her favorite snacks, a map of the forest she had drawn herself, and set out to find the legendary Crystal Cave that was said to sparkle with all the colors of the rainbow."));
  // console.log(await createImageCompletion("As she waddled through the forest, Poppy met various animals who warned her about the challenges ahead. \"The path is tricky,\" said Oliver Owl. \"And you must solve riddles,\" chirped Ruby Robin. But Poppy wasn't deterred; if anything, their warnings made her even more determined."));
  // console.log(await createImageCompletion("After hours of trekking through thick bushes and over mossy logs, Poppy arrived at a clearing where sunlight danced on what appeared to be...a cave entrance! It was hidden behind some thorny bushes but sparkled enticingly in the light."));
  // console.log(await createImageCompletion("Just as Ruby Robin had warned, guarding the entrance was Gideon Guardhog, keeper of riddles. \"To enter,\" Gideon announced in his deep voice, \"you must answer my riddle.\""));
  // console.log(await createImageCompletion("Poppy listened intently as Gideon posed his challenge: \"I speak without a mouth and hear without ears. I have no body but come alive with wind. What am I?\""));

  const greeting = initialGreeting(settings, caller, lastCall);

  ws.send(JSON.stringify(greeting));

  // ws.send(JSON.stringify({
  //   "response_type": "metadata",
  //   "metadata": {
  //     "story_mode": isStoryMode,
  //   }
  // }));

  

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
      const { data: _call } = await supabase
      .from("calls")
      .select("mode")
      .eq("id", call.id)
      .single();

      const request: CustomLlmRequest = JSON.parse(data.toString());

      //console.log(request)

      if (request.interaction_type === "ping_pong") {
        let pingpongResponse: CustomLlmResponse = {
          response_type: "ping_pong",
          timestamp: request.timestamp,
        };
        ws.send(JSON.stringify(pingpongResponse));
        return;
      }

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
      const fullResponse = [];

      for await (const completionChunk of stream) {
        if (completionChunk.choices.length >= 1) {
          const { delta } = completionChunk.choices[0];

          if (delta.tool_calls) {
            for (const tool_call of delta.tool_calls) { // incase there is more than one tool call
              if (tool_call.function.name) {
                fnName = tool_call.function.name;
                //console.log(`Function to call: ${fnName}`);

                if (fnName === "beginStory" && !isStoryMode) {
                  console.log("Story mode activated");
                  isStoryMode = true;
                  storyTranscript = [];
                }

                // if (fnName === "endStory") {
                //   console.log("End of Story mode");
                //   isStoryMode = false;
                //   capturingStory = false;
                //   // ws.send(JSON.stringify({
                //   //   "response_type": "metadata",
                //   //   "metadata": {
                //   //     "story_mode": isStoryMode,
                //   //     "story_transcript": storyTranscript.join("")
                //   //   }
                //   // }));
                //   storyTranscript = [];
                //   ws.send(JSON.stringify({
                //     "response_type": "metadata",
                //     "metadata": {
                //       "story_mode": isStoryMode,
                //     }
                //   }));
                // }
              }
              fnArgs.push(tool_call.function.arguments);
            }
          }

          if (delta.content) {
            fullResponse.push(delta.content);
            ws.send(
              JSON.stringify(buildResponse(request, delta.content, false))
            );
          }
        }
      }

      //console.log("Full response: ", fullResponse.join(""));
      const fullResponseStr = fullResponse.join("");
      //console.log("Initial response:", fullResponseStr, "\nInteraction type: ", request.interaction_type);
      CheckStory(fullResponseStr, ws);

      if (fnName && fnName !== "beginStory") {
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

function CheckStory(response, ws) {
  if (!response || !isStoryMode) return;
  
  let storyTranscript = response;
  let newStory = response.includes("Once upon");
  
  console.log("Story Transcript: ", storyTranscript);

  ws.send(JSON.stringify({
    "response_type": "metadata",
    "metadata": {
      "transcript": storyTranscript,
      "new_story": newStory
    }
  }));
}

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
