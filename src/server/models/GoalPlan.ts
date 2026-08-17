import mongoose, { Schema, model, models } from "mongoose";

const GoalActionSchema = new Schema({
  id: { type: String, required: true },
  description: { type: String, required: true },
  type: {
    type: String,
    enum: ["pricing", "restock", "alert", "promotion", "analysis"],
    required: true,
  },
  status: {
    type: String,
    enum: ["proposed", "approved", "rejected", "executed", "failed"],
    default: "proposed",
  },
  params: { type: Schema.Types.Mixed, default: {} },
  result: { type: Schema.Types.Mixed },
  executedAt: { type: Date },
});

const ProgressMetricSchema = new Schema({
  metric: { type: String, required: true },
  baseline: { type: Number, required: true },
  current: { type: Number, required: true },
  target: { type: Number, required: true },
  measuredAt: { type: Date, default: Date.now },
});

const GoalPlanSchema = new Schema(
  {
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ["active", "paused", "completed", "failed"],
      default: "active",
      index: true,
    },
    actions: [GoalActionSchema],
    progressMetrics: [ProgressMetricSchema],
    agentNotes: { type: String, default: "" },
  },
  { timestamps: true }
);

const GoalPlan = models.GoalPlan || model("GoalPlan", GoalPlanSchema);

export default GoalPlan;
