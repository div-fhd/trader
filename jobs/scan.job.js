const cron = require("node-cron");
const scanner = require("../services/scanner.service");

function startScanner() {

  cron.schedule("*/5 * * * *", async () => {

    await scanner.scanMarket();

  });

}

module.exports = {
  startScanner
};