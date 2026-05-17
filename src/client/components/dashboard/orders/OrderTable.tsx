"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef } from "ag-grid-community";
import { io } from "socket.io-client";
import { useToast } from "@/hooks/use-toast";
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

const GLOBAL_MARKETS = [
  { name: "APAC (Tokyo)", timezone: "Asia/Tokyo" },
  { name: "EMEA (London)", timezone: "Europe/London" },
  { name: "AMER (New York)", timezone: "America/New_York" },
];

export const OrderTable = () => {
  const { toast } = useToast();
  const [rowData, setRowData] = useState<Order[]>([
    { id: "ORD-001", customer: "Alice Smith", amount: 120.50, status: "Processing", region: "AMER (New York)", localTime: new Intl.DateTimeFormat('en-US', { timeStyle: 'medium', timeZone: 'America/New_York' }).format(new Date()) },
    { id: "ORD-002", customer: "Bob Jones", amount: 45.00, status: "Pending", region: "EMEA (London)", localTime: new Intl.DateTimeFormat('en-US', { timeStyle: 'medium', timeZone: 'Europe/London' }).format(new Date()) },
    { id: "ORD-003", customer: "Charlie Brown", amount: 350.00, status: "Shipped", region: "APAC (Tokyo)", localTime: new Intl.DateTimeFormat('en-US', { timeStyle: 'medium', timeZone: 'Asia/Tokyo' }).format(new Date()) },
  ]);

  const [columnDefs] = useState<ColDef<Order>[]>([
    { field: "id", headerName: "Order ID", sortable: true, filter: true },
    { field: "customer", headerName: "Customer", sortable: true, filter: true },
    { field: "amount", headerName: "Total Amount", sortable: true, filter: true, valueFormatter: (params: any) => `$${params.value}` },
    { field: "region", headerName: "Market Region", sortable: true, filter: true },
    { field: "status", headerName: "Status", sortable: true, filter: true, 
      cellRenderer: (params: any) => {
        let color = "bg-gray-200 text-gray-800";
        if (params.value === "Pending") color = "bg-yellow-200 text-yellow-800";
        if (params.value === "Processing") color = "bg-blue-200 text-blue-800";
        if (params.value === "Shipped") color = "bg-green-200 text-green-800";
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${color}`}>
            {params.value}
          </span>
        );
      }
    },
    { field: "localTime", headerName: "Local Time", sortable: true, filter: true },
  ]);

  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 100,
      resizable: true,
    };
  }, []);

  useEffect(() => {
    // Simulate real-time global transactions arriving from different timezones
    const interval = setInterval(() => {
      const market = GLOBAL_MARKETS[Math.floor(Math.random() * GLOBAL_MARKETS.length)];
      const newOrder: Order = {
        id: `ORD-${Math.floor(Math.random() * 100000)}`,
        customer: `Customer ${Math.floor(Math.random() * 100)}`,
        amount: parseFloat((Math.random() * 500 + 50).toFixed(2)),
        status: ["Pending", "Processing", "Shipped"][Math.floor(Math.random() * 3)],
        region: market.name,
        localTime: new Intl.DateTimeFormat('en-US', { timeStyle: 'medium', timeZone: market.timezone }).format(new Date()),
      };

      setRowData((prevData) => [newOrder, ...prevData]);

      if (Number(newOrder.amount) > 200) {
        toast({
          title: "High Value Order Detected! 🚀",
          description: `Order ${newOrder.id} for $${newOrder.amount} from ${newOrder.customer}`,
          variant: "success",
        });
      }
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [toast]);

  return (
    <div className="ag-theme-alpine w-full h-[600px] mt-4 shadow-sm border rounded-lg overflow-hidden">
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        rowSelection="multiple"
        animateRows={true}
      />
    </div>
  );
};
