import dotenv from "dotenv";
// Load up env file which contains credentials
dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

import app from "./server";

// const server = new Server();
app.listen(8080);
