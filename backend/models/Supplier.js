import mongoose from "mongoose";

const kpiSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ["delivery", "quality", "cost", "responsiveness", "compliance"],
      required: true
    },
    score: { type: Number, min: 0, max: 100, required: true },
    notes: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    cage: { type: String, trim: true, default: "" },
    dunsUei: { type: String, trim: true, default: "" },
    naicsCodes: { type: [String], default: [] },
    contactName: { type: String, trim: true, default: "" },
    contactEmail: { type: String, trim: true, lowercase: true, default: "" },
    contactPhone: { type: String, trim: true, default: "" },
    tier: {
      type: String,
      enum: ["prime", "sub", "small_business", "socioeconomic"],
      default: "sub"
    },
    status: {
      type: String,
      enum: ["active", "inactive", "probation", "blacklisted"],
      default: "active"
    },
    kpis: { type: [kpiSchema], default: [] },
    overallScore: { type: Number, min: 0, max: 100, default: null },
    certifications: { type: [String], default: [] },
    pastPerformanceRating: {
      type: String,
      enum: ["exceptional", "very_good", "satisfactory", "marginal", "unsatisfactory", ""],
      default: ""
    },
    activeContracts: { type: Number, default: 0 },
    totalContractValue: { type: Number, default: 0 },
    notes: { type: String, trim: true, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

// Recompute overall score as average of KPI scores before save
supplierSchema.pre("save", function (next) {
  if (this.kpis && this.kpis.length > 0) {
    const total = this.kpis.reduce((sum, k) => sum + k.score, 0);
    this.overallScore = Math.round(total / this.kpis.length);
  }
  next();
});

supplierSchema.index({ name: "text", cage: 1, dunsUei: 1 });
supplierSchema.index({ naicsCodes: 1 });
supplierSchema.index({ overallScore: -1 });

const Supplier = mongoose.model("Supplier", supplierSchema);
export default Supplier;
