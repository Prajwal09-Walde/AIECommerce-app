"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Alert Center</h2>
        <p className="text-muted-foreground">
          System notifications and automated anomaly alerts.
        </p>
      </div>

      <div className="space-y-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center p-4">
            <AlertCircle className="h-6 w-6 text-red-500 mr-4" />
            <div>
              <p className="font-semibold text-red-800">Abnormal Revenue Drop Detected</p>
              <p className="text-sm text-red-600">Sales are down 25% compared to the same time yesterday.</p>
            </div>
            <div className="ml-auto text-xs text-red-500">10 mins ago</div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="flex items-center p-4">
            <AlertTriangle className="h-6 w-6 text-yellow-500 mr-4" />
            <div>
              <p className="font-semibold text-yellow-800">Low Inventory Warning</p>
              <p className="text-sm text-yellow-600">"Wireless Earbuds Pro" is below safety stock level (5 units left).</p>
            </div>
            <div className="ml-auto text-xs text-yellow-500">2 hours ago</div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="flex items-center p-4">
            <Info className="h-6 w-6 text-blue-500 mr-4" />
            <div>
              <p className="font-semibold text-blue-800">System Update Complete</p>
              <p className="text-sm text-blue-600">The latest analytics models have been successfully deployed.</p>
            </div>
            <div className="ml-auto text-xs text-blue-500">1 day ago</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
