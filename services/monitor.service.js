const Signal = require("../models/Signal");
const binance = require("./binance.service");
const telegram = require("./telegram.service");

function hasTouchedEntryZone(candle, entryMin, entryMax) {
  return candle.low <= entryMax && candle.high >= entryMin;
}

async function getLatestCandle(symbol) {
  const candles = await binance.getKlines(symbol, "1m", 2);
  const last = candles[candles.length - 1];

  return {
    high: Number(last.high),
    low: Number(last.low),
    close: Number(last.close)
  };
}

async function markEntryIfNeeded(signal, candle) {
  if (signal.entryAlertSent) return false;
  if (signal.status !== "SENT") return false;

  const touchedEntry = hasTouchedEntryZone(
    candle,
    signal.entryMin,
    signal.entryMax
  );

  if (!touchedEntry) return false;

  signal.entryAlertSent = true;
  signal.status = "ENTRY_HIT";
  signal.currentPrice = candle.close;
  signal.entryHitAt = new Date();
  await signal.save();

  await telegram.sendEntryAlert(signal, candle.close);
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
      const candle = await getLatestCandle(signal.symbol);
      signal.currentPrice = candle.close;

      console.log(
        `🔍 ${signal.symbol} | status=${signal.status} | close=${candle.close} | high=${candle.high} | low=${candle.low} | entry=${signal.entryMin}-${signal.entryMax}`
      );

      await markEntryIfNeeded(signal, candle);

      if (!signal.entryAlertSent) {
        await signal.save();
        continue;
      }

      if (signal.direction === "LONG") {
        if (!signal.tp1Hit && candle.high >= signal.targets[0]) {
          signal.tp1Hit = true;
          signal.status = "TP1_HIT";
          signal.currentPrice = candle.close;
          signal.tp1HitAt = new Date();
          await signal.save();

          await telegram.sendTp1Alert(signal, candle.close);
          console.log(`🎯 TP1 HIT: ${signal.symbol}`);
          continue;
        }

        if (signal.tp1Hit && !signal.tp2Hit && candle.high >= signal.targets[1]) {
          signal.tp2Hit = true;
          signal.status = "TP2_HIT";
          signal.currentPrice = candle.close;
          signal.tp2HitAt = new Date();
          await signal.save();

          await telegram.sendTp2Alert(signal, candle.close);
          console.log(`🚀 TP2 HIT: ${signal.symbol}`);
          continue;
        }

        if (signal.tp2Hit && !signal.tp3Hit && candle.high >= signal.targets[2]) {
          signal.tp3Hit = true;
          signal.status = "CLOSED";
          signal.currentPrice = candle.close;
          signal.tp3HitAt = new Date();
          await signal.save();

          await telegram.sendTp3Alert(signal, candle.close);
          console.log(`🏁 TP3 HIT: ${signal.symbol}`);
          continue;
        }

        if (!signal.stopLossHit && candle.low <= signal.stopLoss) {
          signal.stopLossHit = true;
          signal.status = "STOPPED";
          signal.currentPrice = candle.close;
          signal.stopLossHitAt = new Date();
          await signal.save();

          await telegram.sendStopLossAlert(signal, candle.close);
          console.log(`❌ STOP LOSS HIT: ${signal.symbol}`);
          continue;
        }
      }

      if (signal.direction === "SHORT") {
        if (!signal.tp1Hit && candle.low <= signal.targets[0]) {
          signal.tp1Hit = true;
          signal.status = "TP1_HIT";
          signal.currentPrice = candle.close;
          signal.tp1HitAt = new Date();
          await signal.save();

          await telegram.sendTp1Alert(signal, candle.close);
          console.log(`🎯 TP1 HIT: ${signal.symbol}`);
          continue;
        }

        if (signal.tp1Hit && !signal.tp2Hit && candle.low <= signal.targets[1]) {
          signal.tp2Hit = true;
          signal.status = "TP2_HIT";
          signal.currentPrice = candle.close;
          signal.tp2HitAt = new Date();
          await signal.save();

          await telegram.sendTp2Alert(signal, candle.close);
          console.log(`🚀 TP2 HIT: ${signal.symbol}`);
          continue;
        }

        if (signal.tp2Hit && !signal.tp3Hit && candle.low <= signal.targets[2]) {
          signal.tp3Hit = true;
          signal.status = "CLOSED";
          signal.currentPrice = candle.close;
          signal.tp3HitAt = new Date();
          await signal.save();

          await telegram.sendTp3Alert(signal, candle.close);
          console.log(`🏁 TP3 HIT: ${signal.symbol}`);
          continue;
        }

        if (!signal.stopLossHit && candle.high >= signal.stopLoss) {
          signal.stopLossHit = true;
          signal.status = "STOPPED";
          signal.currentPrice = candle.close;
          signal.stopLossHitAt = new Date();
          await signal.save();

          await telegram.sendStopLossAlert(signal, candle.close);
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