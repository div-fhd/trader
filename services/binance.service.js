const axios = require("axios");

const BASE = "https://fapi.binance.com";

async function getPrice(symbol) {
  const { data } = await axios.get(
    `${BASE}/fapi/v1/ticker/price?symbol=${symbol}`
  );

  return parseFloat(data.price);
}

async function getKlines(symbol, interval = "15m", limit = 300) {
  const { data } = await axios.get(
    `${BASE}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
  );

  return data.map(k => ({
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5])
  }));
}

module.exports = {
  getPrice,
  getKlines
};