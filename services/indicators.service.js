const { EMA, RSI } = require("technicalindicators");

function calculateIndicators(candles) {
  const closes = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume);

  const ema50Arr = EMA.calculate({
    period: 50,
    values: closes
  });

  const ema200Arr = EMA.calculate({
    period: 200,
    values: closes
  });

  const rsiArr = RSI.calculate({
    period: 14,
    values: closes
  });

  const avgVolume =
    volumes.reduce((sum, v) => sum + v, 0) / volumes.length;

  return {
    currentClose: closes[closes.length - 1],
    ema50: ema50Arr.length ? ema50Arr[ema50Arr.length - 1] : null,
    ema200: ema200Arr.length ? ema200Arr[ema200Arr.length - 1] : null,
    rsi: rsiArr.length ? rsiArr[rsiArr.length - 1] : null,
    avgVolume
  };
}

module.exports = {
  calculateIndicators
};