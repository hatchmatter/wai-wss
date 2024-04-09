import { format } from "date-fns";
import { RetellRequest, RetellResponse } from "./types";

export function buildResponse(
  request: RetellRequest,
  content: string,
  contentComplete: boolean = true,
  endCall: boolean = false
): RetellResponse {
  return {
    response_id: request.response_id,
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
