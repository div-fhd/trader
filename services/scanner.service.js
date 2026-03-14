const binance = require("./binance.service");
const indicatorsService = require("./indicators.service");
const ai = require("./ai.service");
const telegram = require("./telegram.service");
const Signal = require("../models/Signal");
const symbols = require("../utils/symbols");
const { calculateSignalScore } = require("./scoring.service");

function passesPreFilter(indicators) {
  if (
    !indicators.ema50 ||
    !indicators.ema200 ||
    !indicators.rsi ||
    !indicators.currentClose
  ) {
    return false;
  }

  const { currentClose, ema50, ema200, rsi } = indicators;

  const distanceFromEMA200 = (Math.abs(currentClose - ema200) / currentClose) * 100;
  const distanceFromEMA50 = (Math.abs(currentClose - ema50) / currentClose) * 100;

  if (distanceFromEMA200 < 0.5) return false;
  if (distanceFromEMA200 > 4) return false;
  if (distanceFromEMA50 < 0.15) return false;
  if (rsi < 40 || rsi > 60) return false;

  return true;
}

function isMissedSignal(signal, currentPrice) {
  if (signal.direction === "LONG" && currentPrice > signal.entryMax) {
    return true;
  }

  if (signal.direction === "SHORT" && currentPrice < signal.entryMin) {
    return true;
  }

  return false;
}

function isPriceNearEntry(signal, currentPrice) {
  const threshold = 0.05; // 5%

  if (signal.direction === "LONG") {
    const distance = (signal.entryMin - currentPrice) / signal.entryMin;
    return distance <= threshold;
  }

  if (signal.direction === "SHORT") {
    const distance = (currentPrice - signal.entryMax) / signal.entryMax;
    return distance <= threshold;
  }

  return true;
}

async function scanMarket(limit = 3, sessionKey = null, options = {}) {
  console.log("🔎 Scanning market...");

  const candidateSignals = [];

  for (const symbol of symbols) {
    try {
      const existingOpenSignal = await Signal.findOne({
        symbol,
        status: { $in: ["SENT", "ENTRY_HIT", "TP1_HIT", "TP2_HIT"] }
      });

      if (existingOpenSignal) {
        console.log(`⏭️ Skipping ${symbol}, open signal exists`);
        continue;
      }

      const candles = await binance.getKlines(symbol, "15m", 300);
      const indicators = indicatorsService.calculateIndicators(candles);

      if (!passesPreFilter(indicators)) {
        console.log(`🚫 Prefilter rejected ${symbol}`);
        continue;
      }

      const signal = await ai.analyzeSignal({
        symbol,
        timeframe: "15m",
        ...indicators
      });

      if (!signal || !signal.shouldTrade) {
        console.log(`❌ No trade for ${symbol}`);
        continue;
      }

      // if (isMissedSignal(signal, indicators.currentClose)) {
      //   console.log(`⌛ Missed signal ${symbol}, current price already passed entry zone`);
      //   continue;
      // }

      // if (!isPriceNearEntry(signal, indicators.currentClose)) {
      //   console.log(`📏 Price too far from entry ${symbol}`);
      //   continue;
      // }

      // const { score, rr } = calculateSignalScore(signal, indicators);

      // if (!score || score < 60) {
      //   console.log(`🏚️ Weak score ${symbol} | score=${score}`);
      //   continue;
      // }

      // if (!rr || rr < 1.2) {
      //   console.log(`⚠️ Weak RR ${symbol} | rr=${rr}`);
      //   continue;
      // }

      candidateSignals.push({
        symbol,
        timeframe: "15m",
        indicators,
        signal,
        score,
        rr
      });

      console.log(`✅ Candidate ${symbol} | score=${score} | rr=${rr.toFixed(2)}`);
    } catch (err) {
      console.log(`scan error: ${symbol} ${err.message}`);
    }
  }

  if (!candidateSignals.length) {
    console.log("📭 No candidate signals found");
    return 0;
  }

  candidateSignals.sort((a, b) => b.score - a.score);

  const topSignals = candidateSignals.slice(0, limit);

  let sentCount = 0;

  for (const item of topSignals) {
    try {
      const existingOpenSignal = await Signal.findOne({
        symbol: item.symbol,
        status: { $in: ["SENT", "ENTRY_HIT", "TP1_HIT", "TP2_HIT"] }
      });

      if (existingOpenSignal) continue;

      const newSignal = await Signal.create({
        symbol: item.symbol,
        timeframe: item.timeframe,
        shouldTrade: item.signal.shouldTrade,
        direction: item.signal.direction,
        entryMin: item.signal.entryMin,
        entryMax: item.signal.entryMax,
        stopLoss: item.signal.stopLoss,
        targets: item.signal.targets,
        confidence: item.signal.confidence,
        summary: item.signal.summary,
        status: "SENT",
        currentPrice: item.indicators.currentClose,
        score: item.score,
        rr: item.rr,
        entryAlertSent: false,
        tp1Hit: false,
        tp2Hit: false,
        tp3Hit: false,
        stopLossHit: false,
        entryHitAt: null,
        tp1HitAt: null,
        tp2HitAt: null,
        tp3HitAt: null,
        stopLossHitAt: null
      });

      const sentMessage = await telegram.sendSignal(newSignal.toObject());

      if (sentMessage) {
        newSignal.telegramMessageId = sentMessage.message_id;
        newSignal.telegramChatId = String(sentMessage.chat.id);
        await newSignal.save();
      }

      sentCount++;
      console.log(`🚨 TOP SIGNAL SENT: ${item.symbol} | score=${item.score}`);
    } catch (err) {
      console.log(`send error: ${item.symbol} ${err.message}`);
    }
  }

  return sentCount;
}

module.exports = {
  scanMarket
};