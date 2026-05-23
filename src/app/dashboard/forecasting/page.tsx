"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Loader2, TrendingUp, Sparkles, LineChart as ChartIcon } from "lucide-react";
import { getForecastingData } from "@/actions/forecasting-actions";

export default function ForecastingPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await getForecastingData();
        setHasData(res.hasData);
        setData(res.data);
      } catch (err) {
        console.error("Failed to load forecasting timeline:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
        <p className="text-muted-foreground text-sm font-medium">Training linear regression networks...</p>
      </div>
    );
  }

  // premium empty state prior to data ingestion
  if (!hasData || data.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Real-Time AI Forecasting</h2>
          <p className="text-muted-foreground">
            Intraday predictive revenue trends adapting live to historical order volume.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center py-32 space-y-4 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 backdrop-blur-sm text-center">
          <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-500">
            <ChartIcon className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg">No prediction timeline generated</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Please ingest and distribute e-commerce transactional data inside the **Dataset** tab to initialize forecasting algorithms!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Real-Time AI Forecasting</h2>
          <p className="text-muted-foreground">
            Predictive revenue trends generated dynamically by running linear regressions over MongoDB daily metrics.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3.5 py-1.5 rounded-full text-xs font-bold border border-emerald-500/20 shadow-sm animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          AI Engine Online
        </div>
      </div>

      <Card className="w-full bg-white/50 dark:bg-black/50 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Historical & Predictive Revenue Timeline</CardTitle>
              <CardDescription>Visualizing 15 historical periods and projecting a 6-period future revenue curve</CardDescription>
            </div>
            <TrendingUp className="w-6 h-6 text-indigo-500 opacity-40" />
          </div>
        </CardHeader>
        <CardContent className="h-[420px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
              <XAxis dataKey="time" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toLocaleString()}`} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.85)', 
                  borderRadius: '12px', 
                  border: 'none', 
                  color: '#fff',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' 
                }} 
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Line 
                type="monotone" 
                dataKey="actual" 
                stroke="#6366f1" 
                strokeWidth={3.5} 
                name="Actual Daily Revenue" 
                dot={{ stroke: '#6366f1', strokeWidth: 1.5, r: 3 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
              <Line 
                type="monotone" 
                dataKey="forecast" 
                stroke="#10b981" 
                strokeWidth={3.5} 
                strokeDasharray="6 6" 
                name="AI Prediction Trend" 
                dot={{ stroke: '#10b981', strokeWidth: 1.5, r: 3 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
