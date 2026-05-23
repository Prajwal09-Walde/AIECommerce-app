"use client";

// Safe quote-aware CSV line splitter
export function parseCSV(text: string): any[] {
  const lines = text.split(/\r\n|\n/);
  if (lines.length <= 1) return [];

  // Parse header
  const headers = parseCSVLine(lines[0]);
  const transactions: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = parseCSVLine(line);
    const row: any = {};

    headers.forEach((header, idx) => {
      let key = header.trim();
      // Standardize headers
      const lower = key.toLowerCase().replace(/[\s_%()]+/g, "");
      if (lower === "userid" || lower === "user") key = "userId";
      else if (lower === "productid" || lower === "product") key = "productId";
      else if (lower === "category") key = "category";
      else if (lower === "price") key = "price";
      else if (lower === "discount") key = "discount";
      else if (lower === "finalprice") key = "finalPrice";
      else if (lower === "paymentmethod") key = "paymentMethod";
      else if (lower === "purchasedate") key = "purchaseDate";

      row[key] = values[idx] || "";
    });

    // Parse values
    const price = parseFloat(row.price || "0");
    const discount = parseFloat(row.discount || "0");
    const finalPrice = parseFloat(row.finalPrice || "0");

    // Standardize purchase date
    let dateObj = new Date();
    const rawDate = row.purchaseDate;
    if (rawDate) {
      if (typeof rawDate === "string" && rawDate.includes("-")) {
        const parts = rawDate.split("-");
        if (parts.length === 3) {
          const m = parseInt(parts[0], 10) - 1;
          const d = parseInt(parts[1], 10);
          const y = parseInt(parts[2], 10);
          dateObj = new Date(y, m, d);
        } else {
          dateObj = new Date(rawDate);
        }
      } else {
        dateObj = new Date(rawDate);
      }
    }
    if (isNaN(dateObj.getTime())) {
      dateObj = new Date();
    }

    transactions.push({
      userId: String(row.userId || "").trim(),
      productId: String(row.productId || "").trim(),
      category: String(row.category || "General").trim(),
      price: isNaN(price) ? 0 : price,
      discount: isNaN(discount) ? 0 : discount,
      finalPrice: isNaN(finalPrice) ? 0 : finalPrice,
      paymentMethod: String(row.paymentMethod || "Other").trim(),
      purchaseDate: dateObj.toISOString(),
    });
  }

  return transactions;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// 1. Overview Calculations
export function calculateOverview(transactions: any[]) {
  if (transactions.length === 0) {
    return { hasData: false, totalRevenue: 0, totalOrders: 0, uniqueCustomers: 0, activeProducts: 0, recentSales: [], dailySalesTrend: [] };
  }

  let totalRevenue = 0;
  const customersSet = new Set<string>();
  const productsSet = new Set<string>();

  transactions.forEach(t => {
    totalRevenue += t.finalPrice;
    customersSet.add(t.userId);
    productsSet.add(t.productId);
  });

  // Recent Sales: last 5 records
  const recentSales = transactions.slice(-5).reverse().map((t, idx) => ({
    id: `tx-${idx}-${Date.now()}`,
    customer: t.userId,
    amount: t.finalPrice,
    date: new Date(t.purchaseDate).toLocaleDateString(),
  }));

  // Daily category sales timeline
  const dailyMap = new Map<string, any>();
  transactions.forEach(t => {
    const dateLabel = new Date(t.purchaseDate).toLocaleDateString(undefined, { month: "2-digit", day: "2-digit" });
    const category = t.category;

    if (!dailyMap.has(dateLabel)) {
      dailyMap.set(dateLabel, { time: dateLabel });
    }
    const record = dailyMap.get(dateLabel);
    record[category] = (record[category] || 0) + t.finalPrice;
  });

  // Sort timeline chronologically and limit to last 15 days
  const dailySalesTrend = Array.from(dailyMap.values())
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(-15);

  return {
    hasData: true,
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    totalOrders: transactions.length,
    uniqueCustomers: customersSet.size,
    activeProducts: productsSet.size,
    recentSales,
    dailySalesTrend,
  };
}

// 2. Customer Intelligence Calculations
export function calculateCustomers(transactions: any[]) {
  if (transactions.length === 0) {
    return { hasData: false, segmentData: [], paymentData: [], topCustomers: [] };
  }

  const customerMap = new Map<string, { ltv: number; orderCount: number }>();
  const paymentMap = new Map<string, number>();

  transactions.forEach(t => {
    // Customer LTV
    if (!customerMap.has(t.userId)) {
      customerMap.set(t.userId, { ltv: 0, orderCount: 0 });
    }
    const c = customerMap.get(t.userId)!;
    c.ltv += t.finalPrice;
    c.orderCount += 1;

    // Payment methods
    paymentMap.set(t.paymentMethod, (paymentMap.get(t.paymentMethod) || 0) + 1);
  });

  // Segmentation brackets
  let highValueCount = 0;
  let regularCount = 0;
  let occasionalCount = 0;

  const SEGMENT_COLORS = {
    "High Value": "#4f46e5",
    "Regular": "#eab308",
    "Occasional": "#f59e0b",
  };

  customerMap.forEach(c => {
    if (c.ltv >= 200) highValueCount++;
    else if (c.ltv >= 50) regularCount++;
    else occasionalCount++;
  });

  const segmentData = [
    { name: "High Value (LTV >= $200)", value: highValueCount, color: SEGMENT_COLORS["High Value"] },
    { name: "Regular ($50 - $200)", value: regularCount, color: SEGMENT_COLORS["Regular"] },
    { name: "Occasional (< $50)", value: occasionalCount, color: SEGMENT_COLORS["Occasional"] },
  ].filter(s => s.value > 0);

  // Payments Pie
  const PAYMENT_COLORS = ["#4f46e5", "#f59e0b", "#fbbf24", "#3730a3", "#818cf8"];
  const paymentData = Array.from(paymentMap.entries()).map(([name, count], idx) => ({
    name,
    value: count,
    color: PAYMENT_COLORS[idx % PAYMENT_COLORS.length]
  }));

  // Top Spenders Directory
  const topCustomers = Array.from(customerMap.entries()).map(([userId, c]) => ({
    customer: userId,
    ltv: parseFloat(c.ltv.toFixed(2)),
    orderCount: c.orderCount
  })).sort((a, b) => b.ltv - a.ltv).slice(0, 100);

  return {
    hasData: true,
    segmentData,
    paymentData,
    topCustomers,
  };
}

// 3. Products Dictionary & Pagination
export function calculateProducts(transactions: any[], page: number = 1, limit: number = 24, search: string = "") {
  if (transactions.length === 0) {
    return { products: [], total: 0, totalPages: 1 };
  }

  // Extract unique products
  const productMap = new Map<string, { productId: string; category: string; price: number; stock: number }>();
  transactions.forEach(t => {
    if (!productMap.has(t.productId)) {
      // Deterministic pseudo-random stock based on productId hash
      let hash = 0;
      for (let i = 0; i < t.productId.length; i++) {
        hash = t.productId.charCodeAt(i) + ((hash << 5) - hash);
      }
      const stock = Math.abs(hash % 80) + 20;

      productMap.set(t.productId, {
        productId: t.productId,
        category: t.category,
        price: t.price,
        stock,
      });
    }
  });

  let list = Array.from(productMap.values()).map(p => ({
    _id: p.productId,
    name: `Product-${p.productId}`,
    category: p.category,
    price: p.price,
    stock: p.stock,
  }));

  if (search) {
    const q = search.toLowerCase();
    list = list.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }

  const total = list.length;
  const skip = (page - 1) * limit;
  const products = list.slice(skip, skip + limit);

  return {
    products,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

// 4. AI Forecasting Linear Regression Engine
export function calculateForecasting(transactions: any[]) {
  if (transactions.length === 0) {
    return { hasData: false, data: [] };
  }

  const dailyMap = new Map<string, number>();
  transactions.forEach(t => {
    const dateLabel = new Date(t.purchaseDate).toLocaleDateString(undefined, { month: "2-digit", day: "2-digit" });
    dailyMap.set(dateLabel, (dailyMap.get(dateLabel) || 0) + t.finalPrice);
  });

  const rawTimeline = Array.from(dailyMap.entries())
    .map(([date, revenue]) => ({ date, revenue: parseFloat(revenue.toFixed(2)) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (rawTimeline.length < 3) {
    return { hasData: false, data: [] };
  }

  const historical = rawTimeline.slice(-15);
  const N = historical.length;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < N; i++) {
    const x = i + 1;
    const y = historical[i].revenue;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const meanX = sumX / N;
  const meanY = sumY / N;

  let num = 0;
  let den = 0;
  for (let i = 0; i < N; i++) {
    const x = i + 1;
    const y = historical[i].revenue;
    num += (x - meanX) * (y - meanY);
    den += Math.pow(x - meanX, 2);
  }

  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;

  const data: any[] = [];
  historical.forEach(h => {
    data.push({
      time: h.date,
      actual: h.revenue,
      forecast: null,
    });
  });

  const lastActual = historical[N - 1].revenue;
  data[N - 1].forecast = lastActual;

  const lastDateParts = historical[N - 1].date.split("/");
  const month = parseInt(lastDateParts[0], 10);
  const day = parseInt(lastDateParts[1], 10);

  for (let i = 1; i <= 6; i++) {
    const forecastX = N + i;
    const forecastVal = Math.max(0, parseFloat((slope * forecastX + intercept).toFixed(2)));

    const futureDate = new Date();
    futureDate.setMonth(month - 1);
    futureDate.setDate(day + i);
    const timeLabel = `${String(futureDate.getMonth() + 1).padStart(2, '0')}/${String(futureDate.getDate()).padStart(2, '0')}`;

    data.push({
      time: timeLabel,
      actual: null,
      forecast: forecastVal,
    });
  }

  return {
    hasData: true,
    data,
  };
}
