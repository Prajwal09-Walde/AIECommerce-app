"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const generateIntradayData = () => {
  const data = [];
  const now = new Date();
  for (let i = 24; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 3600000); // Hourly data
    data.push({
      time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      actual: Math.floor(Math.random() * 2000) + 1000,
      forecast: null,
    });
  }
  
  // Generate future forecast
  const lastActual = data[data.length - 1].actual;
  for (let i = 1; i <= 6; i++) {
    const time = new Date(now.getTime() + i * 3600000);
    data.push({
      time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      actual: null,
      forecast: lastActual! + (Math.floor(Math.random() * 500) - 200) * i,
    });
  }
  return data;
};

export default function ForecastingPage() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    setData(generateIntradayData());

    // Every 5 seconds, simulate the AI recalculating the forecast based on micro-fluctuations
    const interval = setInterval(() => {
      setData((currentData) => {
        const newData = [...currentData];
        // Find forecast indices
        const forecastIndices = newData.map((d, i) => d.actual === null ? i : -1).filter(i => i !== -1);
        
        forecastIndices.forEach(idx => {
          // Adjust forecast slightly to simulate AI "thinking" and adapting to real-time order volume
          const fluctuation = Math.floor(Math.random() * 100) - 50;
          newData[idx] = { ...newData[idx], forecast: newData[idx].forecast + fluctuation };
        });
        
        return newData;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (data.length === 0) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Real-Time AI Forecasting</h2>
        <p className="text-muted-foreground">
          Intraday predictive revenue trends adapting live to global market order flow.
        </p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Intraday Revenue Forecast (Next 6 Hours)</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
              <XAxis dataKey="time" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: '8px', border: 'none', color: '#fff' }} />
              <Line type="monotone" dataKey="actual" stroke="#8884d8" strokeWidth={3} name="Actual Revenue" dot={false} />
              <Line type="monotone" dataKey="forecast" stroke="#82ca9d" strokeWidth={3} strokeDasharray="5 5" name="AI Prediction" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
