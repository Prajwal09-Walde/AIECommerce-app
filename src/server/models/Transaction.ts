import mongoose, { Schema, model, models } from "mongoose";

const KaggleTransactionSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    productId: { type: String, required: true, index: true },
    category: { type: String, required: true, index: true },
    price: { type: Number, required: true },
    discount: { type: Number, required: true },
    finalPrice: { type: Number, required: true },
    paymentMethod: { type: String, required: true, index: true },
    purchaseDate: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

const KaggleTransaction = models.KaggleTransaction || model("KaggleTransaction", KaggleTransactionSchema);

export default KaggleTransaction;
