import { Request, Response } from "express";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  AudioWebsocketProtocol,
  AudioEncoding,
} from "retell-sdk/models/components";
import { RetellClient } from "retell-sdk";

const retell = new RetellClient({
  apiKey: process.env.RETELL_API_KEY,
});

export default async (req: Request, res: Response) => {
  const { agentId, timezone, callerId } = req.body;
  const accessToken = req.headers.authorization.split(" ")[1];

  if (!accessToken) res.status(403).json({ message: "Not authorized" });

  const supabase = new SupabaseClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error) {
      console.error(error);
      res.status(403).json({ message: "Not authorized" });
    }

    const { callDetail } = await retell.registerCall({
      agentId,
      audioWebsocketProtocol: AudioWebsocketProtocol.Web,
      audioEncoding: AudioEncoding.S16le,
      sampleRate: 24000,
    });

    await supabase.from("calls").insert({
      user_id: user.id,
      retell_id: callDetail.callId,
      timezone,
      current_caller_id: callerId
    });

    res.json(callDetail);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to register call" });
  }
};
