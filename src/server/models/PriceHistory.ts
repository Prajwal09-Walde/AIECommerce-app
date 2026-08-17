import mongoose, { Schema, model, models } from "mongoose";

const PriceHistorySchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    productName: { type: String, required: true },
    oldPrice: { type: Number, required: true },
    newPrice: { type: Number, required: true },
    reason: { type: String, required: true },
    approvedBy: {
      type: String,
      required: true,
      default: "auto",
    },
    agentType: {
      type: String,
      enum: ["pricing", "manager", "manual"],
      required: true,
    },
  },
  { timestamps: true }
);

PriceHistorySchema.index({ productId: 1, createdAt: -1 });

const PriceHistory =
  models.PriceHistory || model("PriceHistory", PriceHistorySchema);

export default PriceHistory;
