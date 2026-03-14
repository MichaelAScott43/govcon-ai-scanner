import mongoose from "mongoose";

const opportunitySchema = new mongoose.Schema(
  {
    noticeId: { type: String, required: true, unique: true },
    title: { type: String, default: null },
    solicitationNumber: { type: String, default: null },
    agency: { type: String, default: null },
    subTier: { type: String, default: null },
    office: { type: String, default: null },
    postedDate: { type: String, default: null },
    responseDeadLine: { type: String, default: null },
    naicsCode: { type: String, default: null },
    pscCode: { type: String, default: null },
    setAside: { type: String, default: null },
    noticeType: { type: String, default: null },
    contractType: { type: String, default: null },
    placeOfPerformance: { type: mongoose.Schema.Types.Mixed, default: null },
    uiLink: { type: String, default: null },

    // Analysis fields (populated when a user analyzes this opportunity)
    bidScore: { type: Number, default: null },
    recommendation: { type: String, default: null },
    analysisFlags: { type: [String], default: [] },

    // Tracking which users saved/analyzed this opportunity
    savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Cache metadata
    cachedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

opportunitySchema.index({ naicsCode: 1, postedDate: -1 });
opportunitySchema.index({ cachedAt: 1 }, { expireAfterSeconds: 86400 }); // 24-hour TTL

const Opportunity = mongoose.model("Opportunity", opportunitySchema);

export default Opportunity;
