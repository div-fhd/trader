function calculateRiskReward(signal) {
  if (
    !signal ||
    !signal.targets ||
    !signal.targets.length ||
    signal.entryMax == null ||
    signal.stopLoss == null
  ) {
    return 0;
  }

  const entry = signal.entryMax;
  const risk = Math.abs(entry - signal.stopLoss);
  const reward = Math.abs(signal.targets[0] - entry);

  if (!risk || risk <= 0) return 0;

  return reward / risk;
}

function calculateSignalScore(signal, indicators) {
  let score = 0;

  const price = indicators.currentClose;
  const { ema50, ema200, rsi } = indicators;

  // Trend alignment
  if (signal.direction === "LONG" && price > ema200) score += 20;
  if (signal.direction === "SHORT" && price < ema200) score += 20;

  // EMA50 alignment
  if (signal.direction === "LONG" && price > ema50) score += 10;
  if (signal.direction === "SHORT" && price < ema50) score += 10;

  // RSI alignment
  if (signal.direction === "LONG" && rsi >= 50 && rsi <= 65) score += 15;
  if (signal.direction === "SHORT" && rsi >= 35 && rsi <= 50) score += 15;

  // Confidence
  if (signal.confidence >= 85) score += 20;
  else if (signal.confidence >= 75) score += 15;
  else if (signal.confidence >= 65) score += 10;
  else if (signal.confidence >= 55) score += 5;

  // Risk/Reward
  const rr = calculateRiskReward(signal);
  if (rr >= 3) score += 20;
  else if (rr >= 2) score += 15;
  else if (rr >= 1.5) score += 10;
  else if (rr >= 1.2) score += 5;

  // Entry proximity
  if (signal.entryMin != null && signal.entryMax != null) {
    const midEntry = (signal.entryMin + signal.entryMax) / 2;
    const distancePct = Math.abs(price - midEntry) / price * 100;

    if (distancePct <= 0.5) score += 10;
    else if (distancePct <= 1) score += 7;
    else if (distancePct <= 2) score += 4;
  }

  // Basic structure validity
  if (
    signal.summary &&
    signal.stopLoss != null &&
    Array.isArray(signal.targets) &&
    signal.targets.length === 3
  ) {
    score += 5;
  }

  return {
    score,
    rr
  };
}

module.exports = {
  calculateSignalScore
};