const scanner = require("./scanner.service");
const telegram = require("./telegram.service");

let manualScanRunning = false;

function startTelegramBot() {
  telegram.bot.on("message", async (msg) => {
    try {
      const chatId = String(msg.chat.id);
      const allowedChatId = String(process.env.TELEGRAM_CHAT_ID);
      const text = (msg.text || "").trim();

      if (chatId !== allowedChatId) return;

      if (text === "/start") {
        await telegram.sendMainMenu();
        return;
      }

      if (text === "📡 فحص السوق الآن") {
        if (manualScanRunning) {
          await telegram.bot.sendMessage(chatId, "⏳ يوجد فحص شغال الآن، انتظر.");
          return;
        }

        manualScanRunning = true;

        await telegram.bot.sendMessage(chatId, "📡 جاري فحص السوق الآن...");

        try {
          const sentCount = await scanner.scanMarket(3);

          if (!sentCount) {
            await telegram.bot.sendMessage(chatId, "📭 لا توجد توصيات مناسبة حاليًا.");
          } else {
            await telegram.bot.sendMessage(chatId, `✅ تم إرسال ${sentCount} توصية.`);
          }
        } catch (err) {
          console.log("manual scan error:", err.message);
          await telegram.bot.sendMessage(chatId, "❌ حدث خطأ أثناء فحص السوق.");
        } finally {
          manualScanRunning = false;
        }
      }
      if (text === "📊 الصفقات المفتوحة") {
  const Signal = require("../models/Signal");

  const signals = await Signal.find({
    status: { $in: ["SENT", "ENTRY_HIT", "TP1_HIT", "TP2_HIT"] }
  });

  if (!signals.length) {
    await telegram.bot.sendMessage(chatId, "لا توجد صفقات مفتوحة.");
    return;
  }

    for (const s of signals) {
      await telegram.bot.sendMessage(chatId, `
  🪙 ${s.symbol}
  📈 ${s.direction}
  📊 Status: ${s.status}
  💰 Entry: ${s.entryMin} - ${s.entryMax}
  🎯 TP1: ${s.targets[0]}
  🎯 TP2: ${s.targets[1]}
  🎯 TP3: ${s.targets[2]}
  🛑 SL: ${s.stopLoss}
  `);
    }
  }
    } catch (err) {
      manualScanRunning = false;
      console.log("telegram bot error:", err.message);
    }
  });
}

module.exports = {
  startTelegramBot
};