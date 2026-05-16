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
  time: string;
}

export const OrderTable = () => {
  const { toast } = useToast();
  const [rowData, setRowData] = useState<Order[]>([
    { id: "ORD-001", customer: "Alice Smith", amount: 120.50, status: "Processing", time: "10:00 AM" },
    { id: "ORD-002", customer: "Bob Jones", amount: 45.00, status: "Pending", time: "10:05 AM" },
    { id: "ORD-003", customer: "Charlie Brown", amount: 350.00, status: "Shipped", time: "10:15 AM" },
  ]);

  const [columnDefs] = useState<ColDef<Order>[]>([
    { field: "id", headerName: "Order ID", sortable: true, filter: true },
    { field: "customer", headerName: "Customer", sortable: true, filter: true },
    { field: "amount", headerName: "Total Amount", sortable: true, filter: true, valueFormatter: (params: any) => `$${params.value}` },
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
    { field: "time", headerName: "Time", sortable: true, filter: true },
  ]);

  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 100,
      resizable: true,
    };
  }, []);

  useEffect(() => {
    const socket = io();

    socket.on("new-order", (order: Order) => {
      setRowData((prevData) => [order, ...prevData]);

      if (Number(order.amount) > 200) {
        toast({
          title: "High Value Order Detected! 🚀",
          description: `Order ${order.id} for $${order.amount} from ${order.customer}`,
          variant: "success",
        });
      }
    });

    return () => {
      socket.disconnect();
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
