export { default as functions } from "./functions";

export default [
  {
    type: "function",
    function: {
      name: "saveUserName",
      description:
        "Function that gets called when the user says their name.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "The person's name" },
          message: {
            type: "string",
            description:
              "The message you will say after getting the person's name or switching to a new person.",
          },
        },
        required: ["name", "message"],
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
  // {
  //   type: "function",
  //   function: {
  //     name: "getCurrentDateTime",
  //     description: "The function to call when the user asks for the current day, date, and/or time.",
  //     parameters: {
  //       type: "object",
  //       properties: {
  //         type: {
  //           type: "string",
  //           description: `The type of date and/or time you want to get. Options include "day", "date", "time", and "date_time"`,
  //         },
  //         message: {
  //           type: "string",
  //           description:
  //             "The message you will say with the current day, date and/or time",
  //         },
  //       },
  //       required: ["type", "message"],
  //     },
  //   },
  // },
  {
    type: "function",
    function: {
      name: "updatePreferences",
      description:
        "Function to call when the user mentions their likes, dislikes, things they love, or hate, their favorites, etc.",
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
