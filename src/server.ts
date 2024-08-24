import express from "express";
import { createServer } from "http";
import cors from "cors";
import expressWs from "express-ws";

import { call } from "./routes";

const app = expressWs(express()).app;

createServer(app);

app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

app.get("/_health", async (_req, res) => {
  res.json({ status: "Ok" });
});

app.ws("/call/:id", call);

export default app;
