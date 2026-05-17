"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const generateInitialData = () => {
  const data = [];
  const now = new Date();
  for (let i = 20; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 2000);
    data.push({
      time: time.toLocaleTimeString('en-US', { hour12: false }),
      APAC: Math.floor(Math.random() * 500) + 100,
      EMEA: Math.floor(Math.random() * 800) + 200,
      AMER: Math.floor(Math.random() * 1000) + 300,
    });
  }
  return data;
};

export const OverviewChart = () => {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    setData(generateInitialData());

    const interval = setInterval(() => {
      setData((currentData) => {
        const newData = [...currentData.slice(1)];
        const now = new Date();
        newData.push({
          time: now.toLocaleTimeString('en-US', { hour12: false }),
          APAC: Math.floor(Math.random() * 500) + 100,
          EMEA: Math.floor(Math.random() * 800) + 200,
          AMER: Math.floor(Math.random() * 1000) + 300,
        });
        return newData;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorAMER" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorEMEA" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <XAxis 
          dataKey="time" 
          stroke="#888888" 
          fontSize={12} 
          tickLine={false} 
          axisLine={false} 
          minTickGap={20}
        />
        <YAxis 
          stroke="#888888" 
          fontSize={12} 
          tickLine={false} 
          axisLine={false} 
          tickFormatter={(value) => `$${value}`} 
        />
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
        <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: '8px', border: 'none', color: '#fff' }} />
        <Area type="monotone" dataKey="AMER" stroke="#6366f1" fillOpacity={1} fill="url(#colorAMER)" name="Americas" />
        <Area type="monotone" dataKey="EMEA" stroke="#f59e0b" fillOpacity={1} fill="url(#colorEMEA)" name="Europe & Middle East" />
      </AreaChart>
    </ResponsiveContainer>
  );
};
