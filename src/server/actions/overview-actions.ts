"use server";

import { connectToDatabase } from "@/lib/mongoose";
import Order from "@/models/Order";
import Product from "@/models/Product";
import KaggleTransaction from "@/models/Transaction";

export async function getOverviewStats() {
  await connectToDatabase();

  // 1. Check if we have Order database records
  const orderCount = await Order.countDocuments({});
  const hasDistributedData = orderCount > 0;

  let totalRevenue = 0;
  let totalOrders = 0;
  let uniqueCustomers = 0;
  let activeProducts = 0;
  let recentSales: any[] = [];
  let dailySalesTrend: any[] = [];

  if (hasDistributedData) {
    // A. Query from Distributed Core Collections (Product & Order)
    const revenueAgg = await Order.aggregate([
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);
    totalRevenue = revenueAgg[0]?.total || 0;
    totalOrders = orderCount;

    const customers = await Order.distinct("customer");
    uniqueCustomers = customers.length;

    activeProducts = await Product.countDocuments({});

    // Top 5 recent orders
    const latestOrders = await Order.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    recentSales = latestOrders.map((o: any) => ({
      id: o._id.toString(),
      customer: o.customer,
      amount: o.totalAmount,
      date: o.createdAt.toLocaleDateString(),
    }));

    // Daily Sales Trend: Group by date & category (pivot)
    const trendAgg = await Order.aggregate([
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "productInfo"
        }
      },
      { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%m/%d", date: "$createdAt" } },
            category: { $ifNull: ["$productInfo.category", "Other"] }
          },
          revenue: { $sum: "$items.price" }
        }
      },
      { $sort: { "_id.date": 1 } }
    ]);

    // Pivot categories in JS
    const trendMap = new Map<string, any>();
    trendAgg.forEach((item: any) => {
      const date = item._id.date;
      const category = item._id.category;
      const revenue = parseFloat(item.revenue.toFixed(2));

      if (!trendMap.has(date)) {
        trendMap.set(date, { time: date });
      }
      const record = trendMap.get(date);
      record[category] = (record[category] || 0) + revenue;
    });
    dailySalesTrend = Array.from(trendMap.values()).slice(-15); // limit to last 15 days
  } else {
    // B. Fall back to Raw Kaggle Transaction collection (Standard ingestion)
    const transactionCount = await KaggleTransaction.countDocuments({});
    if (transactionCount > 0) {
      const revenueAgg = await KaggleTransaction.aggregate([
        { $group: { _id: null, total: { $sum: "$finalPrice" } } }
      ]);
      totalRevenue = revenueAgg[0]?.total || 0;
      totalOrders = transactionCount;

      const customers = await KaggleTransaction.distinct("userId");
      uniqueCustomers = customers.length;

      const products = await KaggleTransaction.distinct("productId");
      activeProducts = products.length;

      // Recent sales from transactions
      const latestTx = await KaggleTransaction.find({})
        .sort({ purchaseDate: -1 })
        .limit(5)
        .lean();

      recentSales = latestTx.map((t: any) => ({
        id: t._id.toString(),
        customer: t.userId,
        amount: t.finalPrice,
        date: t.purchaseDate.toLocaleDateString(),
      }));

      // Daily Sales Trend by Category
      const trendAgg = await KaggleTransaction.aggregate([
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%m/%d", date: "$purchaseDate" } },
              category: "$category"
            },
            revenue: { $sum: "$finalPrice" }
          }
        },
        { $sort: { "_id.date": 1 } }
      ]);

      const trendMap = new Map<string, any>();
      trendAgg.forEach((item: any) => {
        const date = item._id.date;
        const category = item._id.category;
        const revenue = parseFloat(item.revenue.toFixed(2));

        if (!trendMap.has(date)) {
          trendMap.set(date, { time: date });
        }
        const record = trendMap.get(date);
        record[category] = (record[category] || 0) + revenue;
      });
      dailySalesTrend = Array.from(trendMap.values()).slice(-15);
    }
  }

  return {
    hasData: totalOrders > 0,
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    totalOrders,
    uniqueCustomers,
    activeProducts,
    recentSales,
    dailySalesTrend,
  };
}
