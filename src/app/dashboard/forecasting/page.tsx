"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { month: "Jan", actual: 4000, forecast: 4100 },
  { month: "Feb", actual: 3000, forecast: 3200 },
  { month: "Mar", actual: 2000, forecast: 2500 },
  { month: "Apr", actual: 2780, forecast: 2800 },
  { month: "May", actual: 1890, forecast: 2000 },
  { month: "Jun", actual: 2390, forecast: 2400 },
  { month: "Jul", forecast: 3490 },
  { month: "Aug", forecast: 4300 },
];

export default function ForecastingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">AI Sales Forecasting</h2>
        <p className="text-muted-foreground">
          Predict future revenue trends based on historical data and AI models.
        </p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Revenue Forecast (Next 2 Months)</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="actual" stroke="#8884d8" strokeWidth={3} name="Actual Revenue" />
              <Line type="monotone" dataKey="forecast" stroke="#82ca9d" strokeWidth={3} strokeDasharray="5 5" name="AI Forecast" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
