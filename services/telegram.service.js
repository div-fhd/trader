const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

async function sendMessage(message) {
  return bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message);
}

async function sendSignal(signal) {
  const message = `
🚨 AI FUTURES SIGNAL

🪙 Coin: ${signal.symbol}
📈 Direction: ${signal.direction}

💰 Entry Zone:
${signal.entryMin} - ${signal.entryMax}

🛑 Stop Loss:
${signal.stopLoss}

🎯 Targets:
TP1: ${signal.targets[0]}
TP2: ${signal.targets[1]}
TP3: ${signal.targets[2]}

📊 Confidence:
${signal.confidence}%

🏆 Score:
${signal.score ?? "N/A"}

⚖️ RR:
${signal.rr ? signal.rr.toFixed(2) : "N/A"}

🧠 Analysis:
${signal.summary}
`;

  await sendMessage(message);
}

async function sendEntryAlert(signal, currentPrice) {
  const message = `
📡 ENTRY ALERT

🪙 Coin: ${signal.symbol}
📈 Direction: ${signal.direction}

💰 Entry Zone:
${signal.entryMin} - ${signal.entryMax}

💵 Current Price:
${currentPrice}

👀 Price has entered the entry zone.
Manual entry decision required.
`;

  await sendMessage(message);
}

async function sendTp1Alert(signal, currentPrice) {
  const message = `
🎯 TARGET 1 HIT

🪙 Coin: ${signal.symbol}
📈 Direction: ${signal.direction}

✅ TP1: ${signal.targets[0]}
💵 Current Price: ${currentPrice}

🔒 Consider protecting the trade.
`;

  await sendMessage(message);
}

async function sendTp2Alert(signal, currentPrice) {
  const message = `
🚀 TARGET 2 HIT

🪙 Coin: ${signal.symbol}
📈 Direction: ${signal.direction}

✅ TP2: ${signal.targets[1]}
💵 Current Price: ${currentPrice}
`;

  await sendMessage(message);
}

async function sendTp3Alert(signal, currentPrice) {
  const message = `
🏁 TARGET 3 HIT

🪙 Coin: ${signal.symbol}
📈 Direction: ${signal.direction}

✅ TP3: ${signal.targets[2]}
💵 Current Price: ${currentPrice}

🎉 Full target reached.
`;

  await sendMessage(message);
}

async function sendStopLossAlert(signal, currentPrice) {
  const message = `
❌ STOP LOSS HIT

🪙 Coin: ${signal.symbol}
📈 Direction: ${signal.direction}

🛑 Stop Loss: ${signal.stopLoss}
💵 Current Price: ${currentPrice}
`;

  await sendMessage(message);
}

module.exports = {
  sendSignal,
  sendEntryAlert,
  sendTp1Alert,
  sendTp2Alert,
  sendTp3Alert,
  sendStopLossAlert
};