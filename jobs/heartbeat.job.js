const telegram = require("../services/telegram.service");

function startHeartbeat() {

  setInterval(async () => {
    try {

      await telegram.sendMessage(
        `🤖 Bot Alive\n⏰ ${new Date().toLocaleString()}`
      );

      console.log("Heartbeat sent");

    } catch (err) {

      console.log("Heartbeat error:", err.message);

    }
  }, 1800000); // كل 30 دقيقة

}

module.exports = {
  startHeartbeat
};