import express, { Request, Response } from "express";
import { RawData, WebSocket } from "ws";
import { createServer, Server as HTTPServer } from "http";
import cors from "cors";
import expressWs from "express-ws";
import { DemoLlmClient } from "./llm_openai";
import { RetellClient } from "retell-sdk";
import {
  AudioWebsocketProtocol,
  AudioEncoding,
} from "retell-sdk/models/components";
import { RetellRequest } from "./types";

export class Server {
  private httpServer: HTTPServer;
  public app: expressWs.Application;
  private llmClient: DemoLlmClient;
  private retellClient: RetellClient;

  constructor() {
    this.app = expressWs(express()).app;
    this.httpServer = createServer(this.app);

    this.app.use(express.json());
    this.app.use(cors());
    this.app.use(express.urlencoded({ extended: true }));

    this.handleRetellLlmWebSocket();
    this.handleRegisterCallAPI();

    this.llmClient = new DemoLlmClient();
    this.retellClient = new RetellClient({
      apiKey: process.env.RETELL_API_KEY,
    });

    this.app.get("/health", async (req, res) => {
      res.json({ status: "Ok" });
    });

    this.app.get("/", async (req, res) => {
      res.json({ status: "Ok" });
    });
  }

  listen(port: number): void {
    this.app.listen(process.env.PORT || port);
    console.log("Listening on " + port);
  }

  handleRegisterCallAPI() {
    this.app.post("/register", async (req: Request, res: Response) => {
      const { agentId } = req.body;

      try {
        const callResponse = await this.retellClient.registerCall({
          agentId,
          audioWebsocketProtocol: AudioWebsocketProtocol.Web,
          audioEncoding: AudioEncoding.S16le,
          sampleRate: 24000,
        });

        res.json(callResponse.callDetail);
      } catch (error) {
        console.error("Error registering call:", error);

        res.status(500).json({ error: "Failed to register call" });
      }
    });
  }

  handleRetellLlmWebSocket() {
    this.app.ws(
      "/llm-websocket/:call_id",
      async (ws: WebSocket, req: Request) => {
        const callId = req.params.call_id;
        console.log("Handle llm ws for: ", callId);

        // Start sending the begin message to signal the client is ready.
        this.llmClient.BeginMessage(ws);

        ws.on("error", (err) => {
          console.error("Error received in LLM websocket client: ", err);
        });

        ws.on("close", (err) => {
          console.error("Closing llm ws for: ", callId);
        });

        ws.on("message", async (data: RawData, isBinary: boolean) => {
          console.log(data.toString());

          if (isBinary) {
            console.error("Got binary message instead of text in websocket.");
            ws.close(1002, "Cannot find corresponding Retell LLM.");
          }

          try {
            const request: RetellRequest = JSON.parse(data.toString());
            this.llmClient.DraftResponse(request, ws);
          } catch (err) {
            console.error("Error in parsing LLM websocket message: ", err);
            ws.close(1002, "Cannot parse incoming message.");
          }
        });
      }
    );
  }
}
