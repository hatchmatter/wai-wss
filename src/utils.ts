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
