import mongoose, { Schema, model, models } from "mongoose";

const AlertSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["anomaly", "low_stock", "pricing", "system", "goal"],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ["critical", "warning", "info"],
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    source: {
      type: String,
      required: true,
      default: "alert-agent",
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
    acknowledged: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// Index for efficient querying of unacknowledged alerts
AlertSchema.index({ acknowledged: 1, createdAt: -1 });

const Alert = models.Alert || model("Alert", AlertSchema);

export default Alert;
