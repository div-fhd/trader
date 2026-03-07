const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function analyzeSignal({
  symbol,
  timeframe,
  currentClose,
  ema50,
  ema200,
  rsi,
  avgVolume
}) {
  const prompt = `
You are a professional crypto futures analyst.

Analyze the following market data and decide whether there is a valid trade setup.

Return JSON only.
Do not return markdown.
Do not explain outside JSON.

Rules:
- If there is no strong setup, return shouldTrade as false.
- Prefer high-quality setups only.
- Use futures-style output.
- Provide realistic entry, stop loss, and 3 targets.
- Confidence must be a number from 0 to 100.

Market Data:
Symbol: ${symbol}
Timeframe: ${timeframe}
Current Price: ${currentClose}
EMA50: ${ema50}
EMA200: ${ema200}
RSI: ${rsi}
Average Volume: ${avgVolume}

Required JSON format (ALWAYS return this structure even if shouldTrade=false):

{
  "shouldTrade": true or false,
  "direction": "LONG or SHORT or NONE",
  "entryMin": number or null,
  "entryMax": number or null,
  "stopLoss": number or null,
  "targets": [number, number, number],
  "confidence": number (0-100),
  "summary": "short professional explanation"
}

If there is NO trade setup:
- shouldTrade = false
- direction = "NONE"
- entryMin = null
- entryMax = null
- stopLoss = null
- targets = [null, null, null]
- still include confidence and summary
`;

  const response = await client.chat.completions.create({
   model: "gpt-5",
    messages: [
      {
        role: "system",
        content: "You are a strict trading signal analyst. Return only valid JSON."
      },
      {
        role: "user",
        content: prompt
      }
    ]
  });

  const content = response.choices[0].message.content.trim();

let cleaned = content
  .replace(/```json/g, "")
  .replace(/```/g, "")
  .trim();

const signal = JSON.parse(cleaned);

// fallback values
if (!signal.direction) signal.direction = "NONE";
if (!signal.targets) signal.targets = [null, null, null];

return signal;
}

module.exports = {
  analyzeSignal
};