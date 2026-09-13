import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

try {
  const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 512,
    messages: [{ role: "user", content: "List exactly 1 fruit, even though the tool wants more." }],
    tools: [
      {
        name: "list_fruits",
        description: "List some fruits.",
        strict: true,
        input_schema: {
          type: "object",
          properties: { fruits: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 } },
          required: ["fruits"],
          additionalProperties: false,
        },
      },
    ],
    tool_choice: { type: "tool", name: "list_fruits" },
  });
  console.log("SUCCESS:", JSON.stringify(response.content, null, 2));
} catch (err) {
  console.error("ERROR:", err.status, err.message);
}
