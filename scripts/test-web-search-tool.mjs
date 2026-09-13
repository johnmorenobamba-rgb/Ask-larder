import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

try {
  const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: "Search the web for the Frymaster FPRE317SC fryer manual. What did you find?" }],
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
  });
  console.log("stop_reason:", response.stop_reason);
  console.log(JSON.stringify(response.content, null, 2).slice(0, 3000));
} catch (err) {
  console.error("ERROR:", err.status, err.message);
  if (err.error) console.error(JSON.stringify(err.error, null, 2));
}
