import fs from "fs";
import path from "path";
import url from "url";

import express from "express";
import morgan from "morgan";
import cors from "cors";
import expressWs from "express-ws";

import { call } from "./routes";

const app = expressWs(express()).app;

app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logDir = path.join(__dirname, "../logs");

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const accessLogStream = fs.createWriteStream(
  path.join(logDir, "./access.log"),
  { flags: "a" }
);

// STDOUT logging
app.use(morgan("dev"));
// File logs
app.use(morgan("combined", { stream: accessLogStream }));

app.get("/_health", async (_req, res) => {
  res.json({ status: "Ok" });
});

app.ws("/call/:id", call);

export default app;
