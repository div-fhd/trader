const cron = require("node-cron");
const scanner = require("../services/scanner.service");

function startScanner() {
  // كل يوم الساعة 10:00 صباحًا
  cron.schedule("0 10 * * *", async () => {
    await scanner.scanMarket();
  });
}

module.exports = {
  startScanner
};