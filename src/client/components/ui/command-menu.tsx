"use client";

import * as React from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { Search, LayoutDashboard, ShoppingCart, Users, Package, LineChart, BellRing } from "lucide-react";

export function CommandMenu() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center pt-[15vh]">
      <Command 
        className="w-[90vw] max-w-[600px] border rounded-xl shadow-2xl bg-popover text-popover-foreground overflow-hidden"
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      >
        <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
          <Search className="mr-2 h-5 w-5 shrink-0 opacity-50" />
          <Command.Input 
            autoFocus
            className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50" 
            placeholder="Type a command or search..." 
          />
        </div>
        <Command.List className="max-h-[300px] overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-sm">No results found.</Command.Empty>
          
          <Command.Group heading="Links" className="px-2 text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
            <Command.Item 
              onSelect={() => runCommand(() => router.push("/dashboard"))}
              className="relative flex cursor-default select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </Command.Item>
            <Command.Item 
              onSelect={() => runCommand(() => router.push("/dashboard/orders"))}
              className="relative flex cursor-default select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              <span>Real-time Orders</span>
            </Command.Item>
            <Command.Item 
              onSelect={() => runCommand(() => router.push("/dashboard/customers"))}
              className="relative flex cursor-default select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
            >
              <Users className="mr-2 h-4 w-4" />
              <span>Customers</span>
            </Command.Item>
            <Command.Item 
              onSelect={() => runCommand(() => router.push("/dashboard/products"))}
              className="relative flex cursor-default select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
            >
              <Package className="mr-2 h-4 w-4" />
              <span>Products</span>
            </Command.Item>
            <Command.Item 
              onSelect={() => runCommand(() => router.push("/dashboard/forecasting"))}
              className="relative flex cursor-default select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
            >
              <LineChart className="mr-2 h-4 w-4" />
              <span>AI Forecasting</span>
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command>
      
      {/* Click outside to close */}
      <div className="fixed inset-0 -z-10" onClick={() => setOpen(false)} />
    </div>
  );
}
