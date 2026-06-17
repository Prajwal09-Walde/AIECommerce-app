"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  DollarSign, 
  ShoppingCart, 
  Tag, 
  Users, 
  TrendingUp, 
  Layers, 
  CreditCard, 
  Download, 
  Search, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Database,
  Grid,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { KaggleCsvImporter } from "./CsvImporter";
import { AgGridReact } from "ag-grid-react";
import { ColDef } from "ag-grid-community";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Legend
} from "recharts";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

interface StatsData {
  hasData: boolean;
  summary: {
    totalRevenue: number;
    totalTransactions: number;
    averageDiscount: number;
    uniqueUsers: number;
    uniqueProducts: number;
  };
  categories: Array<{ name: string; revenue: number; transactions: number }>;
  payments: Array<{ name: string; revenue: number; transactions: number }>;
  trends: Array<{ date: string; revenue: number; transactions: number }>;
}

export const KaggleAnalyticsDashboard = () => {
  const { toast } = useToast();
  
  // States
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [showImporter, setShowImporter] = useState(false);
  
  // Table state
  const [rowData, setRowData] = useState<any[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit] = useState(50);
  
  // Filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);

    return () => clearTimeout(handler);
  }, [search]);

  // Fetch metrics & stats
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const response = await fetch("/api/kaggle-transactions/stats");
      if (!response.ok) throw new Error("Failed to load statistics");
      const data = await response.json();
      setStats(data);
      
      // Auto-open importer if database is empty
      if (!data.hasData) {
        setShowImporter(true);
      } else {
        setShowImporter(false);
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error loading statistics",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch paginated transaction rows
  const fetchTransactions = async () => {
    if (stats && !stats.hasData) {
      setRowData([]);
      return;
    }

    setLoadingRows(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: debouncedSearch,
        category,
        paymentMethod,
      });

      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      // In fetchStats:
      const response = await fetch(`${API_URL}/api/kaggle-transactions/stats`);
      // In fetchTransactions:
      const res = await fetch(`${API_URL}/api/kaggle-transactions?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch transaction records");
      const data = await response.json();
      
      setRowData(data.transactions || []);
      setTotalPages(data.pagination.totalPages || 1);
      setTotalCount(data.pagination.total || 0);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error loading transactions",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoadingRows(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [page, debouncedSearch, category, paymentMethod, stats?.hasData]);

  // ag-Grid Column definitions
  const columnDefs = useMemo<ColDef[]>(() => {
    return [
      { field: "userId", headerName: "Customer ID", sortable: true, filter: true },
      { field: "productId", headerName: "Product ID", sortable: true, filter: true },
      { field: "category", headerName: "Category", sortable: true, filter: true,
        cellRenderer: (p: any) => (
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
            {p.value}
          </span>
        )
      },
      { field: "price", headerName: "Original Price", sortable: true, filter: true, 
        valueFormatter: (p) => `$${parseFloat(p.value).toFixed(2)}`
      },
      { field: "discount", headerName: "Discount", sortable: true, filter: true,
        valueFormatter: (p) => `${parseFloat(p.value).toFixed(0)}%`
      },
      { field: "finalPrice", headerName: "Final Price", sortable: true, filter: true,
        valueFormatter: (p) => `$${parseFloat(p.value).toFixed(2)}`,
        cellStyle: { fontWeight: "bold", color: "#6366f1" }
      },
      { field: "paymentMethod", headerName: "Payment Method", sortable: true, filter: true },
      { field: "purchaseDate", headerName: "Purchase Date", sortable: true, filter: true,
        valueFormatter: (p) => {
          if (!p.value) return "";
          return new Date(p.value).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        }
      },
    ];
  }, []);

  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 110,
      resizable: true,
    };
  }, []);

  // Pie chart custom colors
  const COLORS = ["#6366f1", "#f59e0b", "#f43f5e", "#10b981", "#8b5cf6"];

  if (loadingStats && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <p className="text-slate-500 text-sm font-medium">Gathering dataset analysis insights...</p>
      </div>
    );
  }

  const hasData = stats?.hasData || false;

  return (
    <div className="space-y-8 pb-12">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Kaggle Dataset Analytics</h2>
          <p className="text-muted-foreground">
            Ingest, explore, and run predictive analytics on the Sumit Kumar E-Commerce Dataset.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => {
              fetchStats();
              fetchTransactions();
            }}
            className="flex items-center space-x-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 px-3 py-1.5 rounded-lg text-sm transition-colors font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-950"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload</span>
          </button>
          <button
            type="button"
            onClick={() => setShowImporter(!showImporter)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white flex items-center space-x-2 shadow-sm px-4 py-1.5 rounded-lg text-sm transition-colors font-medium"
          >
            <Download className="w-4 h-4" />
            <span>{showImporter ? "Close Ingest Panel" : "Ingest New Data"}</span>
          </button>
        </div>
      </div>

      {/* Slide-down CSV Importer */}
      {showImporter && (
        <div className="animate-in slide-in-from-top duration-300">
          <KaggleCsvImporter 
            onSuccess={() => {
              fetchStats();
              fetchTransactions();
            }}
          />
        </div>
      )}

      {!hasData ? (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
          <Database className="w-16 h-16 text-indigo-500 mb-4 animate-pulse" />
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">No Transaction Data Loaded</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mt-2 mb-6">
            To view interactive charts, KPIs, and explore products, please drag and drop the `e-commerce-dataset.csv` file using the upload panel above.
          </p>
          <button
            type="button"
            onClick={() => setShowImporter(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg font-medium shadow-sm transition-colors text-sm"
          >
            Open Importer
          </button>
        </div>
      ) : (
        <>
          {/* Summary Metric Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-t-4 border-t-indigo-500 relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Kaggle Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-indigo-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  ${(stats?.summary.totalRevenue || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-indigo-500 flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Processed from synthetic records
                </p>
              </CardContent>
            </Card>

            <Card className="border-t-4 border-t-amber-500 relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Transactions Volume</CardTitle>
                <ShoppingCart className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {(stats?.summary.totalTransactions || 0).toLocaleString()}
                </div>
                <p className="text-xs text-amber-500 flex items-center mt-1">
                  <Layers className="w-3 h-3 mr-1" />
                  Stored entries
                </p>
              </CardContent>
            </Card>

            <Card className="border-t-4 border-t-rose-500 relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Average Discount</CardTitle>
                <Tag className="h-4 w-4 text-rose-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {(stats?.summary.averageDiscount || 0).toFixed(1)}%
                </div>
                <p className="text-xs text-rose-500 flex items-center mt-1">
                  Active markdowns applied
                </p>
              </CardContent>
            </Card>

            <Card className="border-t-4 border-t-emerald-500 relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Unique Customer Segment</CardTitle>
                <Users className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {(stats?.summary.uniqueUsers || 0).toLocaleString()}
                </div>
                <p className="text-xs text-emerald-500 flex items-center mt-1">
                  {stats?.summary.uniqueProducts} Active SKUs
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Panel */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            {/* Sales Trend Line */}
            <Card className="col-span-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-indigo-500" />
                  <span>Sales Revenue Trend Over Time</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#888888" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(d) => {
                        const date = new Date(d);
                        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                      }}
                    />
                    <YAxis 
                      stroke="#888888" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: "8px", color: "#fff" }}
                      formatter={(v: any) => [`$${parseFloat(v).toFixed(2)}`, "Revenue"]}
                      labelFormatter={(l) => `Date: ${new Date(l).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}`}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" name="Revenue" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Payment Method Pie Chart */}
            <Card className="col-span-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-amber-500" />
                  <span>Payment Channels</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px] flex flex-col justify-center">
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats?.payments}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="transactions"
                      >
                        {stats?.payments.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: "8px", color: "#fff" }}
                        formatter={(v: any) => [`${v} sales`, "Transactions"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom Legend */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs mt-4">
                  {stats?.payments.map((entry, index) => (
                    <div key={entry.name} className="flex flex-col items-center">
                      <div className="flex items-center space-x-1.5 font-semibold">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="truncate max-w-[80px]">{entry.name}</span>
                      </div>
                      <span className="text-slate-400 mt-0.5">{entry.transactions} sales</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bar Chart Panel */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center space-x-2">
                <Layers className="w-5 h-5 text-emerald-500" />
                <span>Product Category Revenue</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.categories} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: "8px", color: "#fff" }}
                    formatter={(v: any) => [`$${parseFloat(v).toFixed(2)}`, "Revenue"]}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {stats?.categories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Ag-Grid Detailed Transactions Table */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle className="text-lg font-bold flex items-center space-x-2">
                  <Grid className="w-5 h-5 text-indigo-500" />
                  <span>Kaggle Transactions Explorer ({totalCount.toLocaleString()})</span>
                </CardTitle>
                
                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search User or Product ID..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 pr-4 py-1.5 w-[220px] rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setPage(1);
                    }}
                    className="py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-sm focus:outline-none text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    <option value="">All Categories</option>
                    {stats?.categories.map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>

                  <select
                    value={paymentMethod}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value);
                      setPage(1);
                    }}
                    className="py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-sm focus:outline-none text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    <option value="">All Payment Channels</option>
                    {stats?.payments.map((p) => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="ag-theme-alpine w-full h-[500px] border border-slate-100 dark:border-slate-800/80 rounded-lg overflow-hidden relative shadow-inner">
                {loadingRows && (
                  <div className="absolute inset-0 bg-white/70 dark:bg-slate-950/70 z-50 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                  </div>
                )}
                <AgGridReact
                  rowData={rowData}
                  columnDefs={columnDefs}
                  defaultColDef={defaultColDef}
                  animateRows={true}
                  rowSelection="single"
                />
              </div>

              {/* Table Pagination Toolbar */}
              <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
                <span>
                  Showing page <b>{page}</b> of <b>{totalPages}</b> ({rowData.length} of {totalCount} records loaded)
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1 || loadingRows}
                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg text-xs font-medium disabled:opacity-50 disabled:pointer-events-none transition-colors flex items-center bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    <span>Prev</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page === totalPages || loadingRows}
                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg text-xs font-medium disabled:opacity-50 disabled:pointer-events-none transition-colors flex items-center bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
