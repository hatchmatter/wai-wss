import { base, Config } from "./base";
import { production } from "./production";
import { development } from "./development";

const config = {
  production,
  development,
};

if (!process.env.NODE_ENV) {
  throw new Error("NODE_ENV is not set");
}

export default {
  ...base,
  ...config[process.env.NODE_ENV as keyof typeof config],
} as Config;
