export { default as functions } from "./functions";

export default [
  {
    type: "function",
    function: {
      name: "updateCallerName",
      description: "Function that gets called when you get the person's name.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "The person's name" },
          message: {
            type: "string",
            description:
              "The message you will say after getting the person's name.",
          },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "endCall",
      description: "End the call",
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "The message you will say when ending the call",
          },
        },
        required: ["message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getCurrentDateTime",
      description: "Get the current day, date and/or time.",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            description: `The type of date and/or time you want to get. Options include "day", "date", "time", and "date_time"`,
          },
          message: {
            type: "string",
            description:
              "The message you will say with the current day, date and/or time",
          },
        },
        required: ["type", "timezone", "message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "updatePreferences",
      description:
        "Update the child's preferences (likes, dislikes, favorites, etc) when you learn something new about them.",
      parameters: {
        type: "object",
        properties: {
          preferences: {
            type: "string",
            description:
              "The child's preferences in key-value pairs (JSON format). For example, { favoriteColor: 'blue', favoriteFood: 'pizza', likesUnicorns: true }",
          },
          message: {
            type: "string",
            description:
              "The message you will say when updating the child's preferences",
          },
        },
        required: ["preferences", "message"],
      },
    },
  },
];
