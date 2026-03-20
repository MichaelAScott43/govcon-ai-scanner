import mongoose from "mongoose";

const workflowTaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    status: {
      type: String,
      enum: ["pending", "in_progress", "blocked", "completed", "cancelled"],
      default: "pending"
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium"
    },
    dueDate: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    comments: [
      {
        author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        text: { type: String, trim: true },
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

const workflowSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    type: {
      type: String,
      enum: ["capture", "procurement", "proposal", "contract", "general"],
      default: "general"
    },
    status: {
      type: String,
      enum: ["active", "paused", "completed", "archived"],
      default: "active"
    },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    opportunityId: { type: mongoose.Schema.Types.ObjectId, ref: "Opportunity", default: null },
    opportunityTitle: { type: String, trim: true, default: "" },
    tasks: [workflowTaskSchema],
    tags: { type: [String], default: [] },
    dueDate: { type: Date, default: null },
    completedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

workflowSchema.index({ owner: 1, status: 1 });
workflowSchema.index({ members: 1 });

const Workflow = mongoose.model("Workflow", workflowSchema);
export default Workflow;
