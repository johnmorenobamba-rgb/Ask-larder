import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const img = readFileSync("C:\\Users\\johnm\\AppData\\Local\\Temp\\claude\\test-nameplate.png").toString("base64");

const response = await client.messages.create({
  model: "claude-sonnet-5",
  max_tokens: 512,
  system:
    "You are reading an equipment nameplate or model sticker photo, for an owner to confirm before it's saved. Read only what's actually printed or stamped on the nameplate. Never guess or infer a manufacturer, model, or serial number that isn't legible -- return an empty string for that field instead.",
  messages: [
    {
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: "image/png", data: img } },
        { type: "text", text: "Read this equipment nameplate's details." },
      ],
    },
  ],
  tools: [
    {
      name: "propose_nameplate_details",
      description: "Return the manufacturer/model/serial read off an equipment nameplate photo.",
      strict: true,
      input_schema: {
        type: "object",
        properties: {
          manufacturer: { type: "string" },
          model: { type: "string" },
          serial: { type: "string" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
        },
        required: ["manufacturer", "model", "serial", "confidence"],
        additionalProperties: false,
      },
    },
  ],
  tool_choice: { type: "tool", name: "propose_nameplate_details" },
});

const block = response.content.find((b) => b.type === "tool_use");
console.log(JSON.stringify(block.input, null, 2));
