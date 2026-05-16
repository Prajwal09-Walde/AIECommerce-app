import mongoose, { Schema, model, models } from "mongoose";

const OrderItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
});

const OrderSchema = new Schema(
  {
    customer: { type: String, required: true },
    totalAmount: { type: Number, required: true },
    status: { type: String, required: true },
    items: [OrderItemSchema],
  },
  { timestamps: true }
);

const Order = models.Order || model("Order", OrderSchema);

export default Order;
