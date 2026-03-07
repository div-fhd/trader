const mongoose = require("mongoose");

const SignalSchema = new mongoose.Schema(
  {
    symbol: { type: String, required: true },
    timeframe: { type: String, default: "15m" },

    shouldTrade: { type: Boolean, default: false },
    direction: { type: String, default: "NONE" },

    entryMin: { type: Number, default: null },
    entryMax: { type: Number, default: null },
    stopLoss: { type: Number, default: null },
    targets: { type: [Number], default: [] },

    confidence: { type: Number, default: 0 },
    summary: { type: String, default: "" },

    status: {
      type: String,
      default: "NEW"
      // NEW -> SENT -> ENTRY_HIT -> TP1_HIT -> TP2_HIT -> CLOSED / STOPPED
    },

    entryAlertSent: { type: Boolean, default: false },
    tp1Hit: { type: Boolean, default: false },
    tp2Hit: { type: Boolean, default: false },
    tp3Hit: { type: Boolean, default: false },
    stopLossHit: { type: Boolean, default: false },

    currentPrice: { type: Number, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Signal", SignalSchema);