"use server";

import { connectToDatabase } from "@/lib/mongoose";
import Order from "@/models/Order";
import KaggleTransaction from "@/models/Transaction";

export async function getCustomerIntelligence() {
  await connectToDatabase();

  const orderCount = await Order.countDocuments({});
  const hasDistributedData = orderCount > 0;

  let segmentData: any[] = [];
  let paymentData: any[] = [];

  const SEGMENT_COLORS = {
    "High Value": "#4f46e5",  // Indigo
    "Regular": "#eab308",     // Yellow Gold
    "Occasional": "#f59e0b",  // Gold (Amber)
    "New/Inbound": "#312e81"  // Dark Indigo
  };

  const PAYMENT_COLORS = [
    "#4f46e5", // Indigo
    "#f59e0b", // Amber
    "#fbbf24", // Yellow
    "#3730a3", // Deep Indigo
    "#818cf8", // Pale Indigo
  ];

  if (hasDistributedData) {
    // 1. Core Collections Aggregations
    // Customer Lifetime Value Segmentation
    const customerLtvAgg = await Order.aggregate([
      {
        $group: {
          _id: "$customer",
          ltv: { $sum: "$totalAmount" }
        }
      }
    ]);

    let highValueCount = 0;
    let regularCount = 0;
    let occasionalCount = 0;

    customerLtvAgg.forEach((c: any) => {
      if (c.ltv >= 200) {
        highValueCount++;
      } else if (c.ltv >= 50) {
        regularCount++;
      } else {
        occasionalCount++;
      }
    });

    segmentData = [
      { name: "High Value (LTV >= $200)", value: highValueCount, color: SEGMENT_COLORS["High Value"] },
      { name: "Regular ($50 - $200)", value: regularCount, color: SEGMENT_COLORS["Regular"] },
      { name: "Occasional (< $50)", value: occasionalCount, color: SEGMENT_COLORS["Occasional"] },
    ].filter(s => s.value > 0);

    // Payment Methods aggregation from KaggleTransaction (or fallback to dummy regions since Order model has no direct payment field)
    const paymentAgg = await KaggleTransaction.aggregate([
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    paymentData = paymentAgg.map((p: any, idx: number) => ({
      name: p._id,
      value: p.count,
      color: PAYMENT_COLORS[idx % PAYMENT_COLORS.length]
    }));

    // Top Customers by spend
    const topCustomersAgg = await Order.aggregate([
      {
        $group: {
          _id: "$customer",
          ltv: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { ltv: -1 } },
      { $limit: 100 }
    ]);

    const topCustomers = topCustomersAgg.map((c: any) => ({
      customer: c._id,
      ltv: parseFloat(c.ltv.toFixed(2)),
      orderCount: c.orderCount
    }));

    const hasData = segmentData.length > 0;
    return {
      hasData,
      segmentData,
      paymentData,
      topCustomers,
    };
  } else {
    // 2. Raw Kaggle Transactions Aggregations
    const customerLtvAgg = await KaggleTransaction.aggregate([
      {
        $group: {
          _id: "$userId",
          ltv: { $sum: "$finalPrice" }
        }
      }
    ]);

    let highValueCount = 0;
    let regularCount = 0;
    let occasionalCount = 0;

    customerLtvAgg.forEach((c: any) => {
      if (c.ltv >= 200) {
        highValueCount++;
      } else if (c.ltv >= 50) {
        regularCount++;
      } else {
        occasionalCount++;
      }
    });

    segmentData = [
      { name: "High Value (LTV >= $200)", value: highValueCount, color: SEGMENT_COLORS["High Value"] },
      { name: "Regular ($50 - $200)", value: regularCount, color: SEGMENT_COLORS["Regular"] },
      { name: "Occasional (< $50)", value: occasionalCount, color: SEGMENT_COLORS["Occasional"] },
    ].filter(s => s.value > 0);

    const paymentAgg = await KaggleTransaction.aggregate([
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    paymentData = paymentAgg.map((p: any, idx: number) => ({
      name: p._id,
      value: p.count,
      color: PAYMENT_COLORS[idx % PAYMENT_COLORS.length]
    }));

    // Top Customers by spend
    const topCustomersAgg = await KaggleTransaction.aggregate([
      {
        $group: {
          _id: "$userId",
          ltv: { $sum: "$finalPrice" },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { ltv: -1 } },
      { $limit: 100 }
    ]);

    const topCustomers = topCustomersAgg.map((c: any) => ({
      customer: c._id,
      ltv: parseFloat(c.ltv.toFixed(2)),
      orderCount: c.orderCount
    }));

    return {
      hasData: true,
      segmentData,
      paymentData,
      topCustomers,
    };
  }

  // Provide initial mock statistics if completely empty
  const hasData = segmentData.length > 0;
  if (!hasData) {
    segmentData = [
      { name: "High Value", value: 1, color: SEGMENT_COLORS["High Value"] },
      { name: "Regular", value: 1, color: SEGMENT_COLORS["Regular"] },
      { name: "Occasional", value: 1, color: SEGMENT_COLORS["Occasional"] },
    ];
    paymentData = [
      { name: "No Data Yet", value: 1, color: PAYMENT_COLORS[0] }
    ];
  }

  return {
    hasData,
    segmentData,
    paymentData,
    topCustomers: [],
  };
}
