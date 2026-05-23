"use server";

import { connectToDatabase } from "@/lib/mongoose";
import Order from "@/models/Order";
import KaggleTransaction from "@/models/Transaction";

export async function getOrders(page: number = 1, limit: number = 50, search: string = "") {
  await connectToDatabase();

  const skip = (page - 1) * limit;
  const orderCount = await Order.countDocuments({});
  const hasDistributedData = orderCount > 0;

  let orders: any[] = [];
  let total = 0;

  if (hasDistributedData) {
    // 1. Query from live distributed Order collection
    const query: any = {};
    if (search) {
      query.customer = { $regex: search, $options: "i" };
    }

    const [dbOrders, dbCount] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query),
    ]);

    total = dbCount;
    orders = dbOrders.map((o: any) => {
      // Map payment methods or default regions
      return {
        id: o._id.toString(),
        customer: o.customer,
        amount: o.totalAmount,
        status: o.status,
        region: "AMER (New York)", // Default region
        localTime: new Date(o.createdAt).toLocaleString(),
      };
    });
  } else {
    // 2. Query from raw KaggleTransaction collection
    const query: any = {};
    if (search) {
      query.$or = [
        { userId: { $regex: search, $options: "i" } },
        { productId: { $regex: search, $options: "i" } },
      ];
    }

    const [dbTx, dbCount] = await Promise.all([
      KaggleTransaction.find(query)
        .sort({ purchaseDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      KaggleTransaction.countDocuments(query),
    ]);

    total = dbCount;
    orders = dbTx.map((t: any) => {
      // Map payment method to realistic market region
      let region = "APAC (Tokyo)";
      if (t.paymentMethod.toLowerCase().includes("credit") || t.paymentMethod.toLowerCase().includes("card")) {
        region = "AMER (New York)";
      } else if (t.paymentMethod.toLowerCase().includes("paypal") || t.paymentMethod.toLowerCase().includes("bank")) {
        region = "EMEA (London)";
      }

      return {
        id: t._id.toString(),
        customer: t.userId,
        amount: t.finalPrice,
        status: "Shipped",
        region,
        localTime: new Date(t.purchaseDate).toLocaleString(),
      };
    });
  }

  return {
    orders,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
