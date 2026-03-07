let dailyCount = 0;
let lastReset = new Date().toDateString();

function resetIfNewDay() {
  const today = new Date().toDateString();

  if (today !== lastReset) {
    dailyCount = 0;
    lastReset = today;
  }
}

function canSendSignal() {
  resetIfNewDay();
  return dailyCount < 3;
}

function registerSignal() {
  dailyCount++;
}

module.exports = {
  canSendSignal,
  registerSignal
};