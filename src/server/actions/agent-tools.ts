"use server";

import { connectToDatabase } from "@/lib/mongoose";
import Product from "@/models/Product";
import Order from "@/models/Order";
import KaggleTransaction from "@/models/Transaction";
import User from "@/models/User";
import Alert from "@/models/Alert";
import PriceHistory from "@/models/PriceHistory";

// ─────────────────────────────────────────────
// Gemini Function Declarations (Tool Schemas)
// ─────────────────────────────────────────────

export const AGENT_TOOL_DECLARATIONS = [
  {
    name: "query_products",
    description:
      "Search and filter products in the store inventory. Returns product details including name, category, price, and stock level.",
    parameters: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          description: "Filter by product category (e.g. Electronics, Clothing, Home, Books)",
        },
        search: {
          type: "string",
          description: "Search term to match against product names",
        },
        minPrice: {
          type: "number",
          description: "Minimum price filter",
        },
        maxPrice: {
          type: "number",
          description: "Maximum price filter",
        },
        lowStockOnly: {
          type: "boolean",
          description: "If true, only return products with stock < 10",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default 20)",
        },
      },
    },
  },
  {
    name: "query_orders",
    description:
      "Fetch orders from the store with optional filters. Returns order details including customer, amount, status, and items.",
    parameters: {
      type: "object" as const,
      properties: {
        customer: {
          type: "string",
          description: "Filter by customer name (partial match)",
        },
        status: {
          type: "string",
          description: "Filter by order status (e.g. Processing, Shipped, Delivered)",
        },
        minAmount: {
          type: "number",
          description: "Minimum order amount filter",
        },
        maxAmount: {
          type: "number",
          description: "Maximum order amount filter",
        },
        daysBack: {
          type: "number",
          description: "Only return orders from the last N days",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default 20)",
        },
      },
    },
  },
  {
    name: "query_transactions",
    description:
      "Query raw transaction records from the Kaggle dataset. Returns transaction details including userId, productId, category, price, discount, finalPrice, paymentMethod, and purchaseDate.",
    parameters: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          description: "Filter by product category",
        },
        paymentMethod: {
          type: "string",
          description: "Filter by payment method (Credit Card, PayPal, Bank Transfer, Crypto)",
        },
        daysBack: {
          type: "number",
          description: "Only return transactions from the last N days",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default 30)",
        },
      },
    },
  },
  {
    name: "get_revenue_metrics",
    description:
      "Get aggregate revenue metrics including total revenue, daily revenue trends, category-wise breakdown, and growth rates.",
    parameters: {
      type: "object" as const,
      properties: {
        daysBack: {
          type: "number",
          description: "Calculate metrics for the last N days (default 30)",
        },
      },
    },
  },
  {
    name: "get_inventory_status",
    description:
      "Get a comprehensive inventory status report including stock levels, low-stock alerts, category distribution, and total inventory value.",
    parameters: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_customer_segments",
    description:
      "Get customer segmentation data including LTV-based segments, top customers by spend, payment method distribution, and customer count.",
    parameters: {
      type: "object" as const,
      properties: {
        topN: {
          type: "number",
          description: "Number of top customers to return (default 10)",
        },
      },
    },
  },
  {
    name: "calculate_statistics",
    description:
      "Compute statistical measures on a set of numbers. Provide the metric name and this tool will calculate mean, median, min, max, standard deviation, and growth rate from the store data.",
    parameters: {
      type: "object" as const,
      properties: {
        metric: {
          type: "string",
          enum: ["daily_revenue", "order_values", "product_prices", "discount_rates", "stock_levels"],
          description: "Which metric to compute statistics for",
        },
      },
      required: ["metric"],
    },
  },
  {
    name: "update_product_price",
    description:
      "Propose a price change for a product. This creates a pending price change that requires human approval before being applied. Use this when recommending price adjustments.",
    parameters: {
      type: "object" as const,
      properties: {
        productId: {
          type: "string",
          description: "The MongoDB ObjectId of the product to update",
        },
        newPrice: {
          type: "number",
          description: "The proposed new price",
        },
        reason: {
          type: "string",
          description: "Explanation for why this price change is recommended",
        },
      },
      required: ["productId", "newPrice", "reason"],
    },
  },
  {
    name: "update_product_stock",
    description:
      "Propose a stock level change for a product. This creates a pending change that requires human approval. Use this when recommending restocking or stock adjustments.",
    parameters: {
      type: "object" as const,
      properties: {
        productId: {
          type: "string",
          description: "The MongoDB ObjectId of the product",
        },
        newStock: {
          type: "number",
          description: "The proposed new stock level",
        },
        reason: {
          type: "string",
          description: "Explanation for the stock adjustment recommendation",
        },
      },
      required: ["productId", "newStock", "reason"],
    },
  },
  {
    name: "create_alert",
    description:
      "Create a new alert in the system. Use this to flag issues, anomalies, or important observations that require attention.",
    parameters: {
      type: "object" as const,
      properties: {
        type: {
          type: "string",
          enum: ["anomaly", "low_stock", "pricing", "system", "goal"],
          description: "Type of alert",
        },
        severity: {
          type: "string",
          enum: ["critical", "warning", "info"],
          description: "Severity level of the alert",
        },
        title: {
          type: "string",
          description: "Short title for the alert",
        },
        description: {
          type: "string",
          description: "Detailed description of the alert with context and recommended action",
        },
      },
      required: ["type", "severity", "title", "description"],
    },
  },
];

// ─────────────────────────────────────────────
// Tool Executor Functions
// ─────────────────────────────────────────────

export async function executeAgentTool(
  toolName: string,
  args: Record<string, any>,
  agentSource: string = "analytics"
): Promise<any> {
  await connectToDatabase();

  switch (toolName) {
    case "query_products":
      return await toolQueryProducts(args);
    case "query_orders":
      return await toolQueryOrders(args);
    case "query_transactions":
      return await toolQueryTransactions(args);
    case "get_revenue_metrics":
      return await toolGetRevenueMetrics(args);
    case "get_inventory_status":
      return await toolGetInventoryStatus();
    case "get_customer_segments":
      return await toolGetCustomerSegments(args);
    case "calculate_statistics":
      return await toolCalculateStatistics(args);
    case "update_product_price":
      return await toolUpdateProductPrice(args, agentSource);
    case "update_product_stock":
      return await toolUpdateProductStock(args, agentSource);
    case "create_alert":
      return await toolCreateAlert(args, agentSource);
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ─────────────────────────────────────────────
// Individual Tool Implementations
// ─────────────────────────────────────────────

async function toolQueryProducts(args: Record<string, any>) {
  const query: any = {};

  if (args.category) {
    query.category = { $regex: args.category, $options: "i" };
  }
  if (args.search) {
    query.name = { $regex: args.search, $options: "i" };
  }
  if (args.minPrice !== undefined || args.maxPrice !== undefined) {
    query.price = {};
    if (args.minPrice !== undefined) query.price.$gte = args.minPrice;
    if (args.maxPrice !== undefined) query.price.$lte = args.maxPrice;
  }
  if (args.lowStockOnly) {
    query.stock = { $lt: 10 };
  }

  const limit = Math.min(args.limit || 20, 50);
  const products = await Product.find(query).limit(limit).lean();

  return {
    count: products.length,
    products: products.map((p: any) => ({
      id: p._id.toString(),
      name: p.name,
      category: p.category,
      price: p.price,
      stock: p.stock,
    })),
  };
}

async function toolQueryOrders(args: Record<string, any>) {
  const query: any = {};

  if (args.customer) {
    query.customer = { $regex: args.customer, $options: "i" };
  }
  if (args.status) {
    query.status = { $regex: args.status, $options: "i" };
  }
  if (args.minAmount !== undefined || args.maxAmount !== undefined) {
    query.totalAmount = {};
    if (args.minAmount !== undefined) query.totalAmount.$gte = args.minAmount;
    if (args.maxAmount !== undefined) query.totalAmount.$lte = args.maxAmount;
  }
  if (args.daysBack) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - args.daysBack);
    query.createdAt = { $gte: cutoff };
  }

  const limit = Math.min(args.limit || 20, 50);
  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return {
    count: orders.length,
    orders: orders.map((o: any) => ({
      id: o._id.toString(),
      customer: o.customer,
      totalAmount: o.totalAmount,
      status: o.status,
      itemCount: o.items?.length || 0,
      createdAt: o.createdAt?.toISOString(),
    })),
  };
}

async function toolQueryTransactions(args: Record<string, any>) {
  const query: any = {};

  if (args.category) {
    query.category = { $regex: args.category, $options: "i" };
  }
  if (args.paymentMethod) {
    query.paymentMethod = { $regex: args.paymentMethod, $options: "i" };
  }
  if (args.daysBack) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - args.daysBack);
    query.purchaseDate = { $gte: cutoff };
  }

  const limit = Math.min(args.limit || 30, 100);
  const transactions = await KaggleTransaction.find(query)
    .sort({ purchaseDate: -1 })
    .limit(limit)
    .lean();

  return {
    count: transactions.length,
    transactions: transactions.map((t: any) => ({
      userId: t.userId,
      productId: t.productId,
      category: t.category,
      price: t.price,
      discount: t.discount,
      finalPrice: t.finalPrice,
      paymentMethod: t.paymentMethod,
      purchaseDate: t.purchaseDate?.toISOString(),
    })),
  };
}

async function toolGetRevenueMetrics(args: Record<string, any>) {
  const daysBack = args.daysBack || 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);

  // Try Orders first, fall back to KaggleTransactions
  const orderCount = await Order.countDocuments({});

  if (orderCount > 0) {
    const [totalAgg, dailyAgg, categoryAgg] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: cutoff } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: cutoff } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            revenue: { $sum: "$totalAmount" },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: cutoff } } },
        { $unwind: "$items" },
        {
          $lookup: {
            from: "products",
            localField: "items.productId",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: { $ifNull: ["$product.category", "Other"] },
            revenue: { $sum: "$items.price" },
            count: { $sum: 1 },
          },
        },
        { $sort: { revenue: -1 } },
      ]),
    ]);

    const totalRevenue = totalAgg[0]?.total || 0;
    const totalOrders = totalAgg[0]?.count || 0;
    const dailyTrend = dailyAgg.map((d: any) => ({
      date: d._id,
      revenue: parseFloat(d.revenue.toFixed(2)),
      orders: d.orders,
    }));

    // Calculate growth rate
    const midpoint = Math.floor(dailyTrend.length / 2);
    const firstHalfRev = dailyTrend.slice(0, midpoint).reduce((s: number, d: any) => s + d.revenue, 0);
    const secondHalfRev = dailyTrend.slice(midpoint).reduce((s: number, d: any) => s + d.revenue, 0);
    const growthRate = firstHalfRev > 0 ? ((secondHalfRev - firstHalfRev) / firstHalfRev) * 100 : 0;

    return {
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalOrders,
      averageOrderValue: totalOrders > 0 ? parseFloat((totalRevenue / totalOrders).toFixed(2)) : 0,
      periodDays: daysBack,
      growthRate: parseFloat(growthRate.toFixed(1)),
      dailyTrend,
      categoryBreakdown: categoryAgg.map((c: any) => ({
        category: c._id,
        revenue: parseFloat(c.revenue.toFixed(2)),
        transactionCount: c.count,
      })),
    };
  }

  // Fallback to KaggleTransactions
  const [totalAgg, dailyAgg, categoryAgg] = await Promise.all([
    KaggleTransaction.aggregate([
      { $match: { purchaseDate: { $gte: cutoff } } },
      { $group: { _id: null, total: { $sum: "$finalPrice" }, count: { $sum: 1 } } },
    ]),
    KaggleTransaction.aggregate([
      { $match: { purchaseDate: { $gte: cutoff } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$purchaseDate" } },
          revenue: { $sum: "$finalPrice" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    KaggleTransaction.aggregate([
      { $match: { purchaseDate: { $gte: cutoff } } },
      {
        $group: {
          _id: "$category",
          revenue: { $sum: "$finalPrice" },
          count: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
    ]),
  ]);

  const totalRevenue = totalAgg[0]?.total || 0;
  const totalOrders = totalAgg[0]?.count || 0;
  const dailyTrend = dailyAgg.map((d: any) => ({
    date: d._id,
    revenue: parseFloat(d.revenue.toFixed(2)),
    orders: d.orders,
  }));

  const midpoint = Math.floor(dailyTrend.length / 2);
  const firstHalfRev = dailyTrend.slice(0, midpoint).reduce((s: number, d: any) => s + d.revenue, 0);
  const secondHalfRev = dailyTrend.slice(midpoint).reduce((s: number, d: any) => s + d.revenue, 0);
  const growthRate = firstHalfRev > 0 ? ((secondHalfRev - firstHalfRev) / firstHalfRev) * 100 : 0;

  return {
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    totalOrders,
    averageOrderValue: totalOrders > 0 ? parseFloat((totalRevenue / totalOrders).toFixed(2)) : 0,
    periodDays: daysBack,
    growthRate: parseFloat(growthRate.toFixed(1)),
    dailyTrend,
    categoryBreakdown: categoryAgg.map((c: any) => ({
      category: c._id,
      revenue: parseFloat(c.revenue.toFixed(2)),
      transactionCount: c.count,
    })),
  };
}

async function toolGetInventoryStatus() {
  const products = await Product.find({}).lean();

  const lowStockProducts = products.filter((p: any) => p.stock < 10);
  const categoryDist: Record<string, { count: number; totalStock: number; totalValue: number }> = {};

  products.forEach((p: any) => {
    if (!categoryDist[p.category]) {
      categoryDist[p.category] = { count: 0, totalStock: 0, totalValue: 0 };
    }
    categoryDist[p.category].count++;
    categoryDist[p.category].totalStock += p.stock;
    categoryDist[p.category].totalValue += p.price * p.stock;
  });

  const totalInventoryValue = products.reduce(
    (sum: number, p: any) => sum + p.price * p.stock,
    0
  );

  return {
    totalProducts: products.length,
    totalInventoryValue: parseFloat(totalInventoryValue.toFixed(2)),
    averageStockLevel: products.length > 0
      ? parseFloat(
          (products.reduce((s: number, p: any) => s + p.stock, 0) / products.length).toFixed(1)
        )
      : 0,
    lowStockCount: lowStockProducts.length,
    lowStockProducts: lowStockProducts.map((p: any) => ({
      id: p._id.toString(),
      name: p.name,
      category: p.category,
      price: p.price,
      stock: p.stock,
    })),
    categoryDistribution: Object.entries(categoryDist).map(([cat, data]) => ({
      category: cat,
      ...data,
      totalValue: parseFloat(data.totalValue.toFixed(2)),
    })),
  };
}

async function toolGetCustomerSegments(args: Record<string, any>) {
  const topN = args.topN || 10;
  const orderCount = await Order.countDocuments({});

  if (orderCount > 0) {
    const customerLtvAgg = await Order.aggregate([
      { $group: { _id: "$customer", ltv: { $sum: "$totalAmount" }, orderCount: { $sum: 1 } } },
      { $sort: { ltv: -1 } },
    ]);

    let highValue = 0, regular = 0, occasional = 0;
    customerLtvAgg.forEach((c: any) => {
      if (c.ltv >= 200) highValue++;
      else if (c.ltv >= 50) regular++;
      else occasional++;
    });

    return {
      totalCustomers: customerLtvAgg.length,
      segments: {
        highValue: { count: highValue, label: "LTV >= $200" },
        regular: { count: regular, label: "$50 - $200" },
        occasional: { count: occasional, label: "< $50" },
      },
      topCustomers: customerLtvAgg.slice(0, topN).map((c: any) => ({
        customer: c._id,
        ltv: parseFloat(c.ltv.toFixed(2)),
        orderCount: c.orderCount,
      })),
    };
  }

  // Fallback to KaggleTransactions
  const customerLtvAgg = await KaggleTransaction.aggregate([
    { $group: { _id: "$userId", ltv: { $sum: "$finalPrice" }, orderCount: { $sum: 1 } } },
    { $sort: { ltv: -1 } },
  ]);

  let highValue = 0, regular = 0, occasional = 0;
  customerLtvAgg.forEach((c: any) => {
    if (c.ltv >= 200) highValue++;
    else if (c.ltv >= 50) regular++;
    else occasional++;
  });

  return {
    totalCustomers: customerLtvAgg.length,
    segments: {
      highValue: { count: highValue, label: "LTV >= $200" },
      regular: { count: regular, label: "$50 - $200" },
      occasional: { count: occasional, label: "< $50" },
    },
    topCustomers: customerLtvAgg.slice(0, topN).map((c: any) => ({
      customer: c._id,
      ltv: parseFloat(c.ltv.toFixed(2)),
      orderCount: c.orderCount,
    })),
  };
}

async function toolCalculateStatistics(args: Record<string, any>) {
  let values: number[] = [];
  const metric = args.metric;

  switch (metric) {
    case "daily_revenue": {
      const agg = await KaggleTransaction.aggregate([
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$purchaseDate" } },
            revenue: { $sum: "$finalPrice" },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      values = agg.map((d: any) => d.revenue);
      break;
    }
    case "order_values": {
      const orderCount = await Order.countDocuments({});
      if (orderCount > 0) {
        const orders = await Order.find({}).select("totalAmount").lean();
        values = orders.map((o: any) => o.totalAmount);
      } else {
        const txs = await KaggleTransaction.find({}).select("finalPrice").lean();
        values = txs.map((t: any) => t.finalPrice);
      }
      break;
    }
    case "product_prices": {
      const products = await Product.find({}).select("price").lean();
      values = products.map((p: any) => p.price);
      break;
    }
    case "discount_rates": {
      const txs = await KaggleTransaction.find({}).select("discount").lean();
      values = txs.map((t: any) => t.discount);
      break;
    }
    case "stock_levels": {
      const products = await Product.find({}).select("stock").lean();
      values = products.map((p: any) => p.stock);
      break;
    }
  }

  if (values.length === 0) {
    return { error: "No data available for this metric" };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((s, v) => s + v, 0);
  const mean = sum / values.length;
  const median =
    values.length % 2 === 0
      ? (sorted[values.length / 2 - 1] + sorted[values.length / 2]) / 2
      : sorted[Math.floor(values.length / 2)];

  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  // Growth rate (first half vs second half)
  const mid = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, mid).reduce((s, v) => s + v, 0);
  const secondHalf = values.slice(mid).reduce((s, v) => s + v, 0);
  const growthRate = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;

  return {
    metric,
    count: values.length,
    sum: parseFloat(sum.toFixed(2)),
    mean: parseFloat(mean.toFixed(2)),
    median: parseFloat(median.toFixed(2)),
    min: parseFloat(sorted[0].toFixed(2)),
    max: parseFloat(sorted[sorted.length - 1].toFixed(2)),
    standardDeviation: parseFloat(stdDev.toFixed(2)),
    growthRate: parseFloat(growthRate.toFixed(1)),
  };
}

async function toolUpdateProductPrice(
  args: Record<string, any>,
  agentSource: string
) {
  const { productId, newPrice, reason } = args;

  const product = await Product.findById(productId).lean();
  if (!product) {
    return { error: `Product not found: ${productId}` };
  }

  const oldPrice = (product as any).price;

  // Record price history (but do NOT apply yet — human approval required for manager agent)
  // For pricing agent, we record the proposal
  await PriceHistory.create({
    productId,
    productName: (product as any).name,
    oldPrice,
    newPrice,
    reason,
    approvedBy: "pending",
    agentType: agentSource,
  });

  return {
    success: true,
    message: `Price change proposed for "${(product as any).name}": $${oldPrice} → $${newPrice}. Awaiting approval.`,
    productId,
    productName: (product as any).name,
    oldPrice,
    newPrice,
    reason,
    status: "pending_approval",
  };
}

async function toolUpdateProductStock(
  args: Record<string, any>,
  agentSource: string
) {
  const { productId, newStock, reason } = args;

  const product = await Product.findById(productId).lean();
  if (!product) {
    return { error: `Product not found: ${productId}` };
  }

  // For now, create an alert with the recommendation instead of direct mutation
  await Alert.create({
    type: "low_stock",
    severity: (product as any).stock < 5 ? "critical" : "warning",
    title: `Stock adjustment recommended: ${(product as any).name}`,
    description: `${reason}. Current stock: ${(product as any).stock}, Recommended: ${newStock}`,
    source: agentSource,
    metadata: {
      productId,
      productName: (product as any).name,
      currentStock: (product as any).stock,
      recommendedStock: newStock,
    },
  });

  return {
    success: true,
    message: `Stock adjustment recommendation created for "${(product as any).name}": ${(product as any).stock} → ${newStock}. Alert created for review.`,
    productId,
    productName: (product as any).name,
    currentStock: (product as any).stock,
    recommendedStock: newStock,
  };
}

async function toolCreateAlert(
  args: Record<string, any>,
  agentSource: string
) {
  const alert = await Alert.create({
    type: args.type,
    severity: args.severity,
    title: args.title,
    description: args.description,
    source: agentSource,
    metadata: args.metadata || {},
  });

  return {
    success: true,
    alertId: alert._id.toString(),
    message: `Alert created: [${args.severity.toUpperCase()}] ${args.title}`,
  };
}
