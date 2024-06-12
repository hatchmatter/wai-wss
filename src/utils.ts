import { format } from "date-fns";
import { jsonrepair } from "jsonrepair";
import { ResponseRequiredRequest, ReminderRequiredRequest, CustomLlmRequest, CustomLlmResponse } from "./types";

export function buildResponse(
  request: any,
  content: string,
  contentComplete: boolean = true,
  endCall: boolean = false
): CustomLlmResponse {
  return {
    response_id: request.response_id,
    response_type: "response",
    content,
    content_complete: contentComplete,
    end_call: endCall,
  };
}

export function getCurrentDate(timezone?: string) {
  let now = new Date();

  if (timezone) {
    now = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  }

  return `
    Date: ${format(now, "EEEE, MMMM d, yyyy")}
  `;
}

export function getCurrentTime(timezone?: string) {
  let now = new Date();

  if (timezone) {
    now = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  }

  return `
    Time: ${format(now, "h:mm a")}
  `;
}

export function getCurrentDateTime(timezone?: string) {
  let now = new Date();

  if (timezone) {
    now = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  }

  return `
    Date and Time: ${format(now, "EEEE, MMMM d, yyyy 'at' h:mm a")}
  `;
}

export function argsToObj(args: string) {
  /**
   * sometimes args come in like this:
   * "{\"favoriteDog\":\"Corgi\",\"likesSkiing\":true}", "message": "I've updated your preferences, Bob! Skiing is such an exciting sport. Do you have a favorite place where you like to go skiing?"}{"preferences": "{\"likesMakingCookies\":true,\"favoriteCookie\":\"chocolate chip\"}", "message": ""}
   * which is invalid JSON due to "}{" in the middle.
   */
  args = args.replace(/}{/g, "}(%%){");

  if (args.split("(%%)").length > 1) {
    let tmp = args.split("(%%)");
    args = tmp[0];
  }

  try {
    return JSON.parse(args);
  } catch (err) {
    console.info(
      "Error parsing function arguments. Attempting to repair ",
      err,
      args
    );

    try {
      return JSON.parse(jsonrepair(args));
    } catch (err) {
      console.error("Error repairing JSON: ", err, args);
      return {};
    }
  }
}
