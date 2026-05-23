import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import KaggleTransaction from "@/server/models/Transaction";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();

    // Check if we have any data first
    const dataCount = await KaggleTransaction.countDocuments({});
    if (dataCount === 0) {
      return NextResponse.json({
        hasData: false,
        summary: {
          totalRevenue: 0,
          totalTransactions: 0,
          averageDiscount: 0,
          uniqueUsers: 0,
          uniqueProducts: 0,
        },
        categories: [],
        payments: [],
        trends: [],
      });
    }

    // 1. Overall Summary Stats
    const summaryPromise = KaggleTransaction.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$finalPrice" },
          totalTransactions: { $sum: 1 },
          averageDiscount: { $avg: "$discount" },
        },
      },
    ]);

    // Unique user and product counts
    const uniqueUsersPromise = KaggleTransaction.distinct("userId");
    const uniqueProductsPromise = KaggleTransaction.distinct("productId");

    // 2. Category breakdown (Revenue & Transactions per category)
    const categoriesPromise = KaggleTransaction.aggregate([
      {
        $group: {
          _id: "$category",
          revenue: { $sum: "$finalPrice" },
          transactions: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    // 3. Payment Method breakdown
    const paymentsPromise = KaggleTransaction.aggregate([
      {
        $group: {
          _id: "$paymentMethod",
          revenue: { $sum: "$finalPrice" },
          transactions: { $sum: 1 },
        },
      },
      { $sort: { transactions: -1 } },
    ]);

    // 4. Sales Trend over Time (Grouped by Date)
    const trendsPromise = KaggleTransaction.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$purchaseDate" } },
          revenue: { $sum: "$finalPrice" },
          transactions: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 30 }, // Limit to first 30 days of data for clean rendering
    ]);

    const [summaryResult, uniqueUsers, uniqueProducts, categories, payments, trends] = await Promise.all([
      summaryPromise,
      uniqueUsersPromise,
      uniqueProductsPromise,
      categoriesPromise,
      paymentsPromise,
      trendsPromise,
    ]);

    const summary = {
      totalRevenue: summaryResult[0]?.totalRevenue || 0,
      totalTransactions: summaryResult[0]?.totalTransactions || 0,
      averageDiscount: summaryResult[0]?.averageDiscount || 0,
      uniqueUsers: uniqueUsers.length,
      uniqueProducts: uniqueProducts.length,
    };

    return NextResponse.json({
      hasData: true,
      summary,
      categories: categories.map((c) => ({
        name: c._id,
        revenue: parseFloat(c.revenue.toFixed(2)),
        transactions: c.transactions,
      })),
      payments: payments.map((p) => ({
        name: p._id,
        revenue: parseFloat(p.revenue.toFixed(2)),
        transactions: p.transactions,
      })),
      trends: trends.map((t) => ({
        date: t._id,
        revenue: parseFloat(t.revenue.toFixed(2)),
        transactions: t.transactions,
      })),
    });
  } catch (error: any) {
    console.error("Error in GET /api/kaggle-transactions/stats:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
