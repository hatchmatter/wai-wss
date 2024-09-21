import type { IterableReadableStream } from "@langchain/core/utils/stream";
import type { StreamEvent } from "@langchain/core/tracers/log_stream";

export async function* getEventChunks(
  stream: IterableReadableStream<StreamEvent>,
  eventName: string
) {
  for await (const { event, data } of stream) {
    if (event === eventName) {
      yield data.chunk;
    }
  }
}