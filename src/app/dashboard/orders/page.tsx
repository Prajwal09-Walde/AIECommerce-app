import { OrderTable } from "@/components/dashboard/orders/OrderTable";

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Real-Time Orders</h2>
        <p className="text-muted-foreground">
          Monitor incoming orders instantly via WebSockets with optimized virtualized rendering.
        </p>
      </div>
      <OrderTable />
    </div>
  );
}
