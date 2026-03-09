const telegram = require("../services/telegram.service");

function startHeartbeat() {
 
    try {

       telegram.sendMessage(
        `🤖 Bot Alive\n⏰ ${new Date().toLocaleString()}`
      );

      console.log("Heartbeat sent");

    } catch (err) {

      console.log("Heartbeat error:", err.message);

    }
 
}

module.exports = {
  startHeartbeat
};