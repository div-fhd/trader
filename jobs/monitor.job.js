const monitorService = require("../services/monitor.service");

let isRunning = false;

function startMonitor() {
  setInterval(async () => {
    if (isRunning) {
      console.log("⏭️ monitor skipped, previous run still active");
      return;
    }

    try {
      isRunning = true;
      await monitorService.monitorSignals();
    } catch (error) {
      console.log("❌ monitor job error:", error.message);
    } finally {
      isRunning = false;
    }
  }, 10000);
}

module.exports = {
  startMonitor
};