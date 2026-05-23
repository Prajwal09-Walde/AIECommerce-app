"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Search, Loader2, Users2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { motion } from "framer-motion";
import { getCustomerIntelligence } from "@/actions/customer-actions";

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await getCustomerIntelligence();
        setData(res);
      } catch (err) {
        console.error("Failed to fetch customer intelligence:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter top customer profiles based on search term
  const filteredCustomers = useMemo(() => {
    if (!data || !data.topCustomers) return [];
    if (!searchTerm.trim()) return data.topCustomers;
    return data.topCustomers.filter((c: any) =>
      c.customer.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
        <p className="text-muted-foreground text-sm font-medium">Extracting behavioral profiles...</p>
      </div>
    );
  }

  // Premium empty state prior to ingestion
  if (!data || !data.hasData) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Customer Intelligence</h2>
          <p className="text-muted-foreground">
            Analyze customer segments, retention rates, and lifetime value.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center py-32 space-y-4 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 backdrop-blur-sm text-center">
          <div className="p-4 bg-indigo-500/10 rounded-full text-indigo-500">
            <Users2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg">No buyer intelligence found</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Please upload and distribute the transaction dataset inside the **Dataset** tab to calculate segmentation profiles!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Customer Intelligence</h2>
          <p className="text-muted-foreground">
            Analyze customer segments, purchase behavior, and lifetime value.
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

      {/* Pie Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
          <Card className="h-full border-t-4 border-t-indigo-500 overflow-hidden shadow-lg bg-white/50 dark:bg-black/50 backdrop-blur-md">
            <CardHeader>
              <CardTitle>Customer Segmentation</CardTitle>
              <CardDescription>Distribution of users by purchasing behavior (LTV)</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.segmentData}
                    cx="50%"
                    cy="45%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    animationBegin={200}
                    animationDuration={1200}
                  >
                    {data.segmentData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" className="hover:opacity-80 transition-opacity cursor-pointer outline-none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: '12px', border: 'none', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }} 
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
          <Card className="h-full border-t-4 border-t-amber-500 overflow-hidden shadow-lg bg-white/50 dark:bg-black/50 backdrop-blur-md">
            <CardHeader>
              <CardTitle>Payment Method Breakdown</CardTitle>
              <CardDescription>Popular checkout channels from transaction logs</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.paymentData}
                    cx="50%"
                    cy="45%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    animationBegin={400}
                    animationDuration={1200}
                  >
                    {data.paymentData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" className="hover:opacity-80 transition-opacity cursor-pointer outline-none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: '12px', border: 'none', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }} 
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Customer Index Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="shadow-lg bg-white/50 dark:bg-black/50 backdrop-blur-md border border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>Customer Spend Directory</CardTitle>
            <CardDescription>Listing up to 100 high-value customer accounts and transaction metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/60 font-semibold text-slate-700 dark:text-slate-200">
                  <tr>
                    <th className="px-6 py-3">Customer ID / Email</th>
                    <th className="px-6 py-3">Orders Count</th>
                    <th className="px-6 py-3">Lifetime Value (LTV)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                        No customers match your query.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((customer: any, idx: number) => (
                      <tr 
                        key={customer.customer || idx} 
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                      >
                        <td className="px-6 py-4 font-mono font-medium text-xs text-indigo-600 dark:text-indigo-400">
                          {customer.customer}
                        </td>
                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                          {customer.orderCount} purchases
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                          ${customer.ltv.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
