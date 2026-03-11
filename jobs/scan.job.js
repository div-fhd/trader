const cron = require("node-cron");
const scanner = require("../services/scanner.service");

function startScanner() {
  // 10:30 صباحًا بتوقيت فلسطين = 07:30 UTC
  cron.schedule(
    "30 7 * * *",
    async () => {
      console.log("🌅 Morning scan started...");
      await scanner.scanMarket(3, "morning");
    },
    {
      timezone: "UTC"
    }
  );

  // 4:00 عصرًا بتوقيت فلسطين = 13:00 UTC
  cron.schedule(
    "0 13 * * *",
    async () => {
      console.log("🌆 Evening scan started...");
      await scanner.scanMarket(3, "evening");
    },
    {
      timezone: "UTC"
    }
  );
}

module.exports = {
  startScanner
};