"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef } from "ag-grid-community";
import { getOrders } from "@/actions/order-actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, RefreshCw, ShoppingBag } from "lucide-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

interface Order {
  id: string;
  customer: string;
  amount: number;
  status: string;
  region: string;
  localTime: string;
}

export const OrderTable = () => {
  const { toast } = { toast: (x: any) => console.log(x) }; // Safe toast extraction or fallback
  const [rowData, setRowData] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadData = async (searchVal: string) => {
    setLoading(true);
    try {
      const res = await getOrders(1, 200, searchVal); // Limit to 200 most recent for super snappy grid rendering
      setRowData(res.orders);
    } catch (err) {
      console.error("Failed to load live orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(debouncedSearch);
  }, [debouncedSearch]);

  const [columnDefs] = useState<ColDef<Order>[]>([
    { field: "id", headerName: "Order ID", sortable: true, filter: true, width: 180 },
    { field: "customer", headerName: "Customer ID / Name", sortable: true, filter: true, flex: 1.5 },
    { 
      field: "amount", 
      headerName: "Total Amount", 
      sortable: true, 
      filter: true, 
      width: 140,
      valueFormatter: (params: any) => `$${parseFloat(params.value).toFixed(2)}` 
    },
    { field: "region", headerName: "Market Region", sortable: true, filter: true, width: 160 },
    { 
      field: "status", 
      headerName: "Status", 
      sortable: true, 
      filter: true, 
      width: 130,
      cellRenderer: (params: any) => {
        let color = "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200";
        if (params.value === "Pending") color = "bg-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
        if (params.value === "Processing") color = "bg-indigo-200 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400";
        if (params.value === "Shipped" || params.value === "Delivered") color = "bg-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
        return (
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
            {params.value}
          </span>
        );
      }
    },
    { field: "localTime", headerName: "Order Date / Time", sortable: true, filter: true, flex: 1.2 },
  ]);

  const defaultColDef = useMemo(() => {
    return {
      resizable: true,
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Search & Utility Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 justify-between bg-white/40 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 backdrop-blur-md">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search orders by Customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
        <button
          onClick={() => loadData(debouncedSearch)}
          disabled={loading}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white/30 dark:bg-slate-900/30 backdrop-blur-md">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-muted-foreground text-sm font-medium">Retrieving transaction ledger...</p>
        </div>
      ) : rowData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 backdrop-blur-sm text-center">
          <div className="p-4 bg-indigo-500/10 rounded-full text-indigo-500">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg">No orders found</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Ingest and distribute the Kaggle E-Commerce transaction dataset on the Dataset page to populate this ledger!
            </p>
          </div>
        </div>
      ) : (
        <div className="ag-theme-alpine w-full h-[580px] shadow-lg border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <AgGridReact
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            rowSelection="multiple"
            animateRows={true}
          />
        </div>
      )}
    </div>
  );
};
