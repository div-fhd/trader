const binance = require("./binance.service");
const indicatorsService = require("./indicators.service");
const ai = require("./ai.service");
const telegram = require("./telegram.service");
const Signal = require("../models/Signal");
const symbols = require("../utils/symbols");
const { calculateSignalScore } = require("./scoring.service");
const limiter = require("../utils/dailyLimiter");

function passesPreFilter(indicators) {
  if (!indicators.ema50 || !indicators.ema200 || !indicators.rsi || !indicators.currentClose) {
    return false;
  }

  const { currentClose, ema50, ema200, rsi } = indicators;

  const distanceFromEMA200 = Math.abs(currentClose - ema200) / currentClose * 100;
  const distanceFromEMA50 = Math.abs(currentClose - ema50) / currentClose * 100;

  // لازم السوق يكون أوضح
  if (distanceFromEMA200 < 0.5) return false;

  // لا نريد سعر بعيد جدًا
  if (distanceFromEMA200 > 4) return false;

  // لا نريد حركة ميتة حول EMA50
  if (distanceFromEMA50 < 0.15) return false;

  // RSI نخليه في منطقة أنظف
  if (rsi < 40 || rsi > 60) return false;

  return true;
}
async function scanMarket() {
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

      if (!signal.shouldTrade) {
        console.log(`❌ No trade for ${symbol}`);
        continue;
      }

      const { score, rr } = calculateSignalScore(signal, indicators);

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
    return;
  }

  candidateSignals.sort((a, b) => b.score - a.score);

  const topSignals = candidateSignals.slice(0, 3);

  for (const item of topSignals) {
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
      currentPrice: item.indicators.currentClose
    });

    await telegram.sendSignal({
      ...newSignal.toObject(),
      score: item.score,
      rr: item.rr
    });

    console.log(`🚨 TOP SIGNAL SENT: ${item.symbol} | score=${item.score}`);
  }
}

module.exports = {
  scanMarket
};