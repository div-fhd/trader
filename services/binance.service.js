const axios = require("axios");

const BASE = process.env.BINANCE_BASE || "https://api.binance.com";

async function getPrice(symbol) {
  try {
    const { data } = await axios.get(
      `${BASE}/api/v3/ticker/price`,
      {
        params: { symbol },
        timeout: 10000
      }
    );

    return parseFloat(data.price);
  } catch (err) {
    throw formatAxiosError("getPrice", symbol, err);
  }
}

async function getKlines(symbol, interval = "15m", limit = 300) {
  try {
    const { data } = await axios.get(
      `${BASE}/api/v3/klines`,
      {
        params: { symbol, interval, limit },
        timeout: 10000
      }
    );

    return data.map(k => ({
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5])
    }));
  } catch (err) {
    throw formatAxiosError("getKlines", symbol, err);
  }
}

function formatAxiosError(fnName, symbol, err) {
  const status = err.response?.status;
  const data = err.response?.data;
  const msg = data?.msg || err.message;

  return new Error(`${fnName} ${symbol} failed: ${status || "NO_STATUS"} ${msg}`);
}

module.exports = {
  getPrice,
  getKlines
};