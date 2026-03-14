import mongoose from "mongoose";

const emailPreferenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    enabled: { type: Boolean, default: true },
    frequency: {
      type: String,
      enum: ["daily", "weekly", "never"],
      default: "daily"
    },
    deliveryTime: {
      // Local hour (0–23) when the daily digest is sent
      type: Number,
      default: 7,
      min: 0,
      max: 23
    },
    naicsFilter: {
      // If non-empty, only opportunities matching these NAICS codes are sent
      type: [String],
      default: []
    },
    minBidScore: {
      // Only opportunities with bid score >= this value are included
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    lastSentAt: { type: Date, default: null }
  },
  { timestamps: true }
);

const EmailPreference = mongoose.model("EmailPreference", emailPreferenceSchema);

export default EmailPreference;
