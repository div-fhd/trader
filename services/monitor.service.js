const Signal = require("../models/Signal");
const binance = require("./binance.service");
const telegram = require("./telegram.service");
const { addLog } = require("../utils/liveLogs");

function isInEntryZone(price, entryMin, entryMax) {
  return price >= entryMin && price <= entryMax;
}

function isEntryTriggered(signal, currentPrice) {
  if (signal.direction === "LONG") {
    return (
      isInEntryZone(currentPrice, signal.entryMin, signal.entryMax) ||
      currentPrice > signal.entryMax
    );
  }

  if (signal.direction === "SHORT") {
    return (
      isInEntryZone(currentPrice, signal.entryMin, signal.entryMax) ||
      currentPrice < signal.entryMin
    );
  }

  return false;
}

async function markEntryIfNeeded(signal, currentPrice) {
  if (signal.entryAlertSent) return false;
  if (signal.status !== "SENT") return false;

  if (!isEntryTriggered(signal, currentPrice)) {
    return false;
  }

  signal.entryAlertSent = true;
  signal.status = "ENTRY_HIT";
  await signal.save();

  await telegram.sendEntryAlert(signal, currentPrice);
  console.log(`📡 ENTRY HIT: ${signal.symbol}`);

  return true;
}

async function monitorSignals() {
  console.log("👀 Monitoring signals...");

  const signals = await Signal.find({
    status: { $in: ["SENT", "ENTRY_HIT", "TP1_HIT", "TP2_HIT"] }
  });

  for (const signal of signals) {
    try {
      const currentPrice = await binance.getPrice(signal.symbol);
      signal.currentPrice = currentPrice;

      console.log(
        `🔍 ${signal.symbol} | status=${signal.status} | price=${currentPrice} | entry=${signal.entryMin}-${signal.entryMax}`
      );

      // 1) أول شيء: تأكيد الدخول إذا لزم
      await markEntryIfNeeded(signal, currentPrice);

      // 2) لا نكمل أهداف أو ستوب إلا إذا الدخول تحقق
      if (!signal.entryAlertSent) {
        await signal.save();
        continue;
      }

      // LONG LOGIC
      if (signal.direction === "LONG") {
        if (!signal.tp1Hit && currentPrice >= signal.targets[0]) {
          signal.tp1Hit = true;
          signal.status = "TP1_HIT";
          await signal.save();

          await telegram.sendTp1Alert(signal, currentPrice);
          console.log(`🎯 TP1 HIT: ${signal.symbol}`);
          continue;
        }

        if (signal.tp1Hit && !signal.tp2Hit && currentPrice >= signal.targets[1]) {
          signal.tp2Hit = true;
          signal.status = "TP2_HIT";
          await signal.save();

          await telegram.sendTp2Alert(signal, currentPrice);
          console.log(`🚀 TP2 HIT: ${signal.symbol}`);
          continue;
        }

        if (signal.tp2Hit && !signal.tp3Hit && currentPrice >= signal.targets[2]) {
          signal.tp3Hit = true;
          signal.status = "CLOSED";
          await signal.save();

          await telegram.sendTp3Alert(signal, currentPrice);
          console.log(`🏁 TP3 HIT: ${signal.symbol}`);
          continue;
        }

        if (!signal.stopLossHit && currentPrice <= signal.stopLoss) {
          signal.stopLossHit = true;
          signal.status = "STOPPED";
          await signal.save();

          await telegram.sendStopLossAlert(signal, currentPrice);
          console.log(`❌ STOP LOSS HIT: ${signal.symbol}`);
          continue;
        }
      }

      // SHORT LOGIC
      if (signal.direction === "SHORT") {
        if (!signal.tp1Hit && currentPrice <= signal.targets[0]) {
          signal.tp1Hit = true;
          signal.status = "TP1_HIT";
          await signal.save();

          await telegram.sendTp1Alert(signal, currentPrice);
          console.log(`🎯 TP1 HIT: ${signal.symbol}`);
          continue;
        }

        if (signal.tp1Hit && !signal.tp2Hit && currentPrice <= signal.targets[1]) {
          signal.tp2Hit = true;
          signal.status = "TP2_HIT";
          await signal.save();

          await telegram.sendTp2Alert(signal, currentPrice);
          console.log(`🚀 TP2 HIT: ${signal.symbol}`);
          continue;
        }

        if (signal.tp2Hit && !signal.tp3Hit && currentPrice <= signal.targets[2]) {
          signal.tp3Hit = true;
          signal.status = "CLOSED";
          await signal.save();

          await telegram.sendTp3Alert(signal, currentPrice);
          console.log(`🏁 TP3 HIT: ${signal.symbol}`);
          continue;
        }

        if (!signal.stopLossHit && currentPrice >= signal.stopLoss) {
          signal.stopLossHit = true;
          signal.status = "STOPPED";
          await signal.save();

          await telegram.sendStopLossAlert(signal, currentPrice);
          console.log(`❌ STOP LOSS HIT: ${signal.symbol}`);
          continue;
        }
      }

      await signal.save();
    } catch (err) {
      console.log("monitor error:", signal.symbol, err.message);
    }
  }
}

module.exports = {
  monitorSignals
};