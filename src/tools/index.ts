export { default as functions } from './functions'

export default [
  {
    type: "function",
    function: {
      name: "updateCallerName",
      description: "Update the user's name when they provide it",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "The user's name" },
          message: {
            type: "string",
            description:
              "The message you will say when letting the user know you will remember their name",
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
      description: "Get the current date and/or time.",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            description: `The type of date and/or time you want to get. Options include "day", "date", "time", and "date_time"`,
          },
          message: {
            type: "string",
            description: `The message you will say with the current date and/or time`,
          },
        },
        required: ["type", "timezone", "message"],
      },
    },
  },
]