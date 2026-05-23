"use server";

import { connectToDatabase } from "@/lib/mongoose";
import Order from "@/models/Order";
import KaggleTransaction from "@/models/Transaction";

export async function getForecastingData() {
  await connectToDatabase();

  const orderCount = await Order.countDocuments({});
  const hasDistributedData = orderCount > 0;

  let rawTimeline: Array<{ date: string; revenue: number }> = [];

  if (hasDistributedData) {
    // 1. Group distributed orders daily
    const dailyAgg = await Order.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%m/%d", date: "$createdAt" } },
          revenue: { $sum: "$totalAmount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    rawTimeline = dailyAgg.map(t => ({ date: t._id, revenue: parseFloat(t.revenue.toFixed(2)) }));
  } else {
    // 2. Group raw transactions daily
    const dailyAgg = await KaggleTransaction.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%m/%d", date: "$purchaseDate" } },
          revenue: { $sum: "$finalPrice" }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    rawTimeline = dailyAgg.map(t => ({ date: t._id, revenue: parseFloat(t.revenue.toFixed(2)) }));
  }

  // Fallback if there's no data
  if (rawTimeline.length < 3) {
    return {
      hasData: false,
      data: []
    };
  }

  // Limit to last 15 historical periods for regression
  const historical = rawTimeline.slice(-15);
  const N = historical.length;

  // Perform Linear Regression y = mx + c
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

  // Generate output list
  const data: any[] = [];

  // Add historical data points
  historical.forEach((h, idx) => {
    data.push({
      time: h.date,
      actual: h.revenue,
      forecast: null,
    });
  });

  // Last actual joins the forecast line for seamless Recharts line transitions
  const lastActual = historical[N - 1].revenue;
  data[N - 1].forecast = lastActual;

  // Project next 6 days
  const lastDateParts = historical[N - 1].date.split("/");
  const month = parseInt(lastDateParts[0], 10);
  const day = parseInt(lastDateParts[1], 10);

  for (let i = 1; i <= 6; i++) {
    const forecastX = N + i;
    const forecastVal = Math.max(0, parseFloat((slope * forecastX + intercept).toFixed(2)));

    // Create next date labels
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
