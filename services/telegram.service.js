const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatDateTime(dateValue) {
  if (!dateValue) return "—";

  const d = new Date(dateValue);

  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleString("en-GB", {
    timeZone: "Asia/Hebron",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function formatTarget(label, value, hit, hitAt) {
  const safeValue = escapeHtml(value);

  if (hit) {
    return `• <s>${label}: ${safeValue}</s> ✅ ${formatDateTime(hitAt)}`;
  }

  return `• ${label}: <b>${safeValue}</b>`;
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function calcPercent(from, to, direction) {
  const a = toNum(from);
  const b = toNum(to);

  if (!a || !b) return null;

  if (direction === "LONG") {
    return ((b - a) / a) * 100;
  }

  if (direction === "SHORT") {
    return ((a - b) / a) * 100;
  }

  return null;
}

function formatPct(value) {
  if (value === null || value === undefined) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function buildProgressLine(signal) {
  const entry = signal.entryAlertSent ? "✅" : "⏳";
  const tp1 = signal.tp1Hit ? "✅" : "⏳";
  const tp2 = signal.tp2Hit ? "✅" : "⏳";
  const tp3 = signal.tp3Hit ? "✅" : "⏳";
  const sl = signal.stopLossHit ? "❌" : "⏳";

  return `📍 <b>Progress:</b> ENTRY ${entry} | TP1 ${tp1} | TP2 ${tp2} | TP3 ${tp3} | SL ${sl}`;
}

function buildSignalMessage(signal) {
  const statusMap = {
    SENT: "Waiting Entry",
    ENTRY_HIT: "Entry Hit",
    TP1_HIT: "TP1 Hit",
    TP2_HIT: "TP2 Hit",
    CLOSED: "Closed",
    STOPPED: "Stopped"
  };

  const statusText = statusMap[signal.status] || signal.status || "Unknown";

  const entryRef =
    signal.direction === "LONG"
      ? signal.entryMax
      : signal.entryMin;

  const riskPct = calcPercent(entryRef, signal.stopLoss, signal.direction);
  const tp1Pct = calcPercent(entryRef, signal.targets?.[0], signal.direction);
  const tp2Pct = calcPercent(entryRef, signal.targets?.[1], signal.direction);
  const tp3Pct = calcPercent(entryRef, signal.targets?.[2], signal.direction);

  return `
🚨 <b>AI FUTURES SIGNAL</b>

🪙 <b>Coin:</b> ${escapeHtml(signal.symbol)}
📈 <b>Direction:</b> ${escapeHtml(signal.direction)}
📌 <b>Status:</b> <b>${escapeHtml(statusText)}</b>
${buildProgressLine(signal)}

🕒 <b>Created:</b> ${formatDateTime(signal.createdAt)}

💰 <b>Entry Zone:</b> <b>${escapeHtml(signal.entryMin)} — ${escapeHtml(signal.entryMax)}</b>
🛑 <b>Stop Loss:</b> <b>${escapeHtml(signal.stopLoss)}</b>
💵 <b>Current Price:</b> <b>${escapeHtml(signal.currentPrice ?? "N/A")}</b>

🎯 <b>Targets:</b>
${formatTarget("TP1", signal.targets?.[0], signal.tp1Hit, signal.tp1HitAt)}
${formatTarget("TP2", signal.targets?.[1], signal.tp2Hit, signal.tp2HitAt)}
${formatTarget("TP3", signal.targets?.[2], signal.tp3Hit, signal.tp3HitAt)}

📊 <b>Confidence:</b> <b>${escapeHtml(signal.confidence)}%</b>
🏆 <b>Score:</b> <b>${escapeHtml(signal.score ?? "N/A")}</b>
⚖️ <b>RR:</b> <b>${escapeHtml(signal.rr ? signal.rr.toFixed(2) : "N/A")}</b>

📐 <b>Move %:</b>
• <b>Risk:</b> ${formatPct(riskPct)}
• <b>TP1:</b> ${formatPct(tp1Pct)}
• <b>TP2:</b> ${formatPct(tp2Pct)}
• <b>TP3:</b> ${formatPct(tp3Pct)}

🧠 <b>Analysis:</b>
${escapeHtml(signal.summary)}

🕒 <b>Entry Hit:</b> ${formatDateTime(signal.entryHitAt)}
🕒 <b>TP1 Hit:</b> ${formatDateTime(signal.tp1HitAt)}
🕒 <b>TP2 Hit:</b> ${formatDateTime(signal.tp2HitAt)}
🕒 <b>TP3 Hit:</b> ${formatDateTime(signal.tp3HitAt)}
🕒 <b>SL Hit:</b> ${formatDateTime(signal.stopLossHitAt)}
`.trim();
}

async function sendMessage(message, options = {}) {
  try {
    const result = await bot.sendMessage(
      process.env.TELEGRAM_CHAT_ID,
      message,
      {
        parse_mode: "HTML",
        ...options
      }
    );

    console.log("📬 Telegram message sent");
    return result;
  } catch (error) {
    console.log("❌ Telegram send error:", error.message);
    throw error;
  }
}

async function sendSignal(signal) {
  const message = buildSignalMessage(signal);
  return sendMessage(message);
}

async function updateSignalMessage(signal) {
  if (!signal.telegramMessageId || !signal.telegramChatId) {
    console.log(`⚠️ Missing telegram message info for ${signal.symbol}`);
    return null;
  }

  const message = buildSignalMessage(signal);

  try {
    const result = await bot.editMessageText(message, {
      chat_id: signal.telegramChatId,
      message_id: signal.telegramMessageId,
      parse_mode: "HTML"
    });

    console.log(`✏️ Telegram message updated: ${signal.symbol}`);
    return result;
  } catch (error) {
    console.log("❌ Telegram edit error:", error.message);
    throw error;
  }
}

async function sendEntryAlert(signal, currentPrice) {
  signal.currentPrice = currentPrice;
  return updateSignalMessage(signal);
}

async function sendTp1Alert(signal, currentPrice) {
  signal.currentPrice = currentPrice;
  return updateSignalMessage(signal);
}

async function sendTp2Alert(signal, currentPrice) {
  signal.currentPrice = currentPrice;
  return updateSignalMessage(signal);
}

async function sendTp3Alert(signal, currentPrice) {
  signal.currentPrice = currentPrice;
  return updateSignalMessage(signal);
}

async function sendStopLossAlert(signal, currentPrice) {
  signal.currentPrice = currentPrice;
  return updateSignalMessage(signal);
}

async function sendMainMenu() {
  return bot.sendMessage(
    process.env.TELEGRAM_CHAT_ID,
    "تم تفعيل لوحة التحكم ✅",
    {
      reply_markup: {
        keyboard: [
          [{ text: "📡 فحص السوق الآن" }],
          [{ text: "📊 الصفقات المفتوحة" }]
        ],
        resize_keyboard: true
      }
    }
  );
}

module.exports = {
  bot,
  sendSignal,
  updateSignalMessage,
  sendMessage,
  sendEntryAlert,
  sendTp1Alert,
  sendTp2Alert,
  sendTp3Alert,
  sendStopLossAlert,
  sendMainMenu,
  buildSignalMessage
};