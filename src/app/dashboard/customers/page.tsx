"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Search } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { motion } from "framer-motion";

const segmentData = [
  { name: "High Value", value: 400, color: "#4f46e5" }, // Indigo
  { name: "At Risk", value: 300, color: "#f59e0b" },    // Gold (Amber)
  { name: "New", value: 300, color: "#312e81" },        // Dark Indigo
  { name: "Regular", value: 200, color: "#eab308" },    // Yellow Gold
];

const sourceData = [
  { name: "Organic Search", value: 500, color: "#4f46e5" }, // Indigo
  { name: "Social Media", value: 250, color: "#f59e0b" },   // Gold
  { name: "Direct", value: 150, color: "#fbbf24" },         // Light Gold
  { name: "Referral", value: 100, color: "#3730a3" },       // Deep Indigo
];

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Customer Intelligence</h2>
          <p className="text-muted-foreground">
            Analyze customer segments, retention rates, and lifetime value.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search customers..."
            className="pl-8 h-9 w-full md:w-[300px] rounded-full border border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm px-3 py-1 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
          <Card className="h-full border-t-4 border-t-indigo-500 overflow-hidden shadow-lg">
            <CardHeader>
              <CardTitle>Customer Segmentation</CardTitle>
              <CardDescription>Distribution of users by purchasing behavior</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={segmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                    animationBegin={200}
                    animationDuration={1500}
                  >
                    {segmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" className="hover:opacity-80 transition-opacity cursor-pointer outline-none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} 
                    itemStyle={{ color: '#1e293b', fontWeight: 'bold' }} 
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
          <Card className="h-full border-t-4 border-t-emerald-500 overflow-hidden shadow-lg">
            <CardHeader>
              <CardTitle>Acquisition Sources</CardTitle>
              <CardDescription>Where your highest LTV customers originate</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                    animationBegin={400}
                    animationDuration={1500}
                  >
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" className="hover:opacity-80 transition-opacity cursor-pointer outline-none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} 
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
