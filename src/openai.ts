import OpenAI from "openai";
import { RetellRequest, Utterance } from "./types";
import createAssistantPrompt from "./assistantPrompt";
import tools from "./tools";
import { Json } from "./types/supabase";

const MODEL = "gpt-4o";
//const MODEL = "gpt-4-turbo-preview";
// const MODEL = "LLaMA_CPP";

const openai: OpenAI = new OpenAI({
  // baseURL: "http://localhost:9000/v1", // uncomment to run llamafile https://github.com/Mozilla-Ocho/llamafile
  apiKey: process.env.OPENAI_APIKEY,
  organization: process.env.OPENAI_ORGANIZATION_ID,
});

export async function createStreamingCompletion(
  prompt: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
) {
  const stream = await openai.chat.completions.create({
    model: MODEL,
    messages: prompt,
    // @ts-ignore
    tools,
    stream: true,
    temperature: 0.4,
    frequency_penalty: 1,
    max_tokens: 500,
  });

  return stream;
}

// Define strict styling guidelines
const stylingGuidelines = `
**Art Style Guidelines:**
- The illustrations should have a whimsical and imaginative feel, with bright and cheerful colors.
- The style should be hand-drawn and slightly cartoonish, with soft edges and gentle shading.
- Characters and settings should be drawn with soft, rounded lines and vibrant colors.
- Ensure a consistent design for all characters, with expressive features and a slightly cartoonish appearance to appeal to young readers.
- Maintain a rich and varied color palette that complements the natural setting. For forest scenes, use greens, browns, and golds; for water scenes, use blues and greens, etc.
- All illustrations should match these guidelines to ensure a cohesive and harmonious visual style throughout the story.
`;

export async function createImagePrompt(firstImage: boolean, story: string, backStory?: string, pastPrompt?: string) {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: "You are an assistant that helps generate consistent and cohesive prompts for creating children's book illustrations. Your job is to ensure that illustrations are drawn in the same style, with characters and settings looking the same across multiple scenes."
    },
    {
      role: "user",
      content: firstImage 
        ? `This is the first image in the series. This prompt will help define extremely strict artistic and stylistic guidelines for future prompts to adhere to.\n\n${stylingGuidelines}` 
        : `Previous backstory: ${backStory}\n\nHere is the most recent prompt you generated: "${pastPrompt}".\n\nPlease ensure that the new prompt helps generate an illustration consistent with the style and details of the last prompt. The artistic elements should remain as close to the same as possible.`
    },
    {
      role: "user",
      content: `Current story section: ${story}\nPlease generate a detailed and consistent prompt for an illustration based on the story section provided. The new illustration should match the style, character appearances, and color palette of the previous illustrations, ensuring it looks like it was made by the same artist.`
    }
  ];

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: messages,
    temperature: 0.2,
  });

  const generatedPrompt = response.choices[0].message.content;
  //console.log(generatedPrompt);
  return generatedPrompt;
}

export async function createImageCompletion(prompt: string) {
  const imageRequest: any = {
    model: "dall-e-3",
    prompt,
    n: 1,
    size: "1792x1024",
  };

  const response = await openai.images.generate(imageRequest);

  const image_url = response.data[0].url;

  return image_url;
}

export function preparePrompt(
  request: RetellRequest,
  assistantName: string,
  caller?: { name: string; preferences: Json },
  callers?: { name: string }[],
  previousTranscripts?: string,
  timezone?: string
) {
  const transcript = createTranscript(request.transcript);
  const requestMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
    [
      {
        role: "system",
        content: createAssistantPrompt(
          assistantName,
          caller,
          callers,
          previousTranscripts,
          timezone
        ),
      },
    ];

  for (const message of transcript) {
    requestMessages.push(message);
  }

  if (request.interaction_type === "reminder_required") {
    // Change this content if you want a different reminder message
    requestMessages.push({
      role: "user",
      content: "(Now the user has not responded in a while, you would say:)",
    });
  }

  return requestMessages;
}

function createTranscript(conversation: Utterance[]) {
  const result: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

  for (let turn of conversation) {
    result.push({
      role: turn.role === "agent" ? "assistant" : "user",
      content: turn.content,
    });
  }
  return result;
}
