"use client";

import React, { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface OverviewChartProps {
  data: any[];
}

const PREMIUM_PALETTE = [
  { stroke: "#6366f1", fill: "#6366f1", gradientId: "colorIndigo" }, // Indigo
  { stroke: "#f59e0b", fill: "#f59e0b", gradientId: "colorAmber" },  // Amber
  { stroke: "#10b981", fill: "#10b981", gradientId: "colorEmerald" },// Emerald
  { stroke: "#06b6d4", fill: "#06b6d4", gradientId: "colorCyan" },   // Cyan
  { stroke: "#ec4899", fill: "#ec4899", gradientId: "colorPink" },   // Pink
];

export const OverviewChart: React.FC<OverviewChartProps> = ({ data }) => {
  // Dynamically discover all unique categories (keys) present in the trend data
  const categoryKeys = useMemo(() => {
    if (!data || data.length === 0) return [];
    const keys = new Set<string>();
    data.forEach((d) => {
      Object.keys(d).forEach((k) => {
        if (k !== "time" && k !== "id") {
          keys.add(k);
        }
      });
    });
    return Array.from(keys).slice(0, 4); // Limit to top 4 categories for visual clarity
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-[350px] items-center justify-center text-muted-foreground text-sm font-medium">
        Waiting for stream timeline data...
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          {categoryKeys.map((key, index) => {
            const colors = PREMIUM_PALETTE[index % PREMIUM_PALETTE.length];
            return (
              <linearGradient id={colors.gradientId} key={colors.gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors.fill} stopOpacity={0.4} />
                <stop offset="95%" stopColor={colors.fill} stopOpacity={0} />
              </linearGradient>
            );
          })}
        </defs>
        <XAxis 
          dataKey="time" 
          stroke="#888888" 
          fontSize={11} 
          tickLine={false} 
          axisLine={false} 
          minTickGap={20}
        />
        <YAxis 
          stroke="#888888" 
          fontSize={11} 
          tickLine={false} 
          axisLine={false} 
          tickFormatter={(value) => `$${value}`} 
        />
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'rgba(0,0,0,0.85)', 
            borderRadius: '12px', 
            border: 'none', 
            color: '#fff',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' 
          }} 
          itemStyle={{ fontSize: '12px' }}
        />
        {categoryKeys.map((key, index) => {
          const colors = PREMIUM_PALETTE[index % PREMIUM_PALETTE.length];
          return (
            <Area 
              key={key}
              type="monotone" 
              dataKey={key} 
              stroke={colors.stroke} 
              strokeWidth={2.5}
              fillOpacity={1} 
              fill={`url(#${colors.gradientId})`} 
              name={key}
              stackId="1" // Stacked area chart for visual depth
            />
          );
        })}
      </AreaChart>
    </ResponsiveContainer>
  );
};
