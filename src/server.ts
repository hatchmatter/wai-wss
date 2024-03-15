import express, { Request, Response } from "express";
import { RawData, WebSocket } from "ws";
import { createServer, Server as HTTPServer } from "http";
import cors from "cors";
import expressWs from "express-ws";
import OpenAiClient from "./openai";
import { RetellClient } from "retell-sdk";
import {
  AudioWebsocketProtocol,
  AudioEncoding,
} from "retell-sdk/models/components";
import { RetellRequest } from "./types";

const DEFAULT_GREETING = "Hey kids! How may I help you? Ask me anything.";

export class Server {
  private httpServer: HTTPServer;
  public app: expressWs.Application;
  private openaiClient: OpenAiClient;
  private retellClient: RetellClient;
  private greeting: string;

  constructor() {
    this.app = expressWs(express()).app;
    this.httpServer = createServer(this.app);

    this.app.use(express.json());
    this.app.use(cors());
    this.app.use(express.urlencoded({ extended: true }));

    this.handleRetellLlmWebSocket();
    this.handleRegisterCallAPI();

    this.openaiClient = new OpenAiClient();
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
  }

  handleRegisterCallAPI() {
    this.app.post("/register", async (req: Request, res: Response) => {
      const { agentId, assistantName, greeting } = req.body;

      this.openaiClient.setAssistantName(assistantName);
      this.greeting = greeting;

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
        const call_id = req.params.call_id;

        // Send a greeting message to the client
        const res = {
          response_id: 0,
          content: this.greeting || DEFAULT_GREETING,
          content_complete: true,
          end_call: false,
        };

        ws.send(JSON.stringify(res));

        ws.on("error", (err) => {
          console.error("Error received in LLM websocket client: ", err);
        });

        ws.on("close", (err) => {
          // console.error("Closing llm ws for: ", call_id);
        });

        ws.on("message", async (data: RawData, isBinary: boolean) => {
          if (isBinary) {
            console.error("Got binary message instead of text in websocket.");
            ws.close(1002, "Cannot find corresponding Retell LLM.");
          }

          try {
            const request: RetellRequest = JSON.parse(data.toString());
            this.openaiClient.DraftResponse(request, ws);
          } catch (err) {
            console.error("Error in parsing LLM websocket message: ", err);
            ws.close(1002, "Cannot parse incoming message.");
          }
        });
      }
    );
  }
}
