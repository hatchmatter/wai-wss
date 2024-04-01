import dotenv from "dotenv";
// Load up env file which contains credentials
dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

import app from "./server";

app.listen(process.env.PORT || 8080);
