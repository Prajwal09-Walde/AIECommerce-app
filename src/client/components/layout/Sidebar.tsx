"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingCart, Users, Package, LineChart, BellRing, ChevronLeft, ChevronRight, Sparkles, Menu, Database } from "lucide-react";
import { cn } from "@/lib/utils";

const routes = [
  {
    label: "Overview",
    icon: LayoutDashboard,
    href: "/dashboard",
    color: "text-sky-500",
  },
  {
    label: "Dataset",
    icon: Database,
    href: "/dashboard/analytics",
    color: "text-indigo-500",
  },
  {
    label: "Orders (Real-time)",
    icon: ShoppingCart,
    href: "/dashboard/orders",
    color: "text-violet-500",
  },
  {
    label: "Customers",
    icon: Users,
    href: "/dashboard/customers",
    color: "text-pink-700",
  },
  {
    label: "Products",
    icon: Package,
    href: "/dashboard/products",
    color: "text-orange-700",
  },
  {
    label: "AI Forecasting",
    icon: LineChart,
    href: "/dashboard/forecasting",
    color: "text-emerald-500",
  },
  {
    label: "AI RAG Analyst",
    icon: Sparkles,
    href: "/dashboard/ai-analysis",
    color: "text-amber-500",
  },
  {
    label: "Alerts",
    icon: BellRing,
    href: "/dashboard/alerts",
    color: "text-red-500",
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
}

export const Sidebar = ({ isCollapsed, setIsCollapsed }: SidebarProps) => {
  const pathname = usePathname();

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-white/70 dark:bg-black/70 backdrop-blur-md border-r border-slate-200 dark:border-slate-800 transition-colors">
      <div className="px-3 py-2 flex-1 relative">
        {/* Toggle Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-4 top-6 bg-amber-500 text-black rounded-full p-1 shadow-md hover:bg-amber-400 z-[90] transition-colors"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <Menu className="w-4 h-4" />
        </button>

        <Link href="/dashboard" className={cn("flex items-center mb-14 transition-all duration-300", isCollapsed ? "justify-center" : "pl-3")}>
          <div className="relative w-8 h-8 flex-shrink-0 bg-gradient-to-br from-indigo-600 to-amber-500 rounded-lg flex items-center justify-center shadow-lg">
            <LineChart className="text-white w-5 h-5" />
          </div>
          {!isCollapsed && (
            <h1 className="text-2xl font-bold ml-4 text-slate-900 dark:text-white truncate">
              Analytics AI
            </h1>
          )}
        </Link>
        <div className="space-y-2">
          {routes.map((route) => (
            <Link
              href={route.href}
              key={route.href}
              className={cn(
                "group flex p-3 w-full font-medium cursor-pointer rounded-lg transition-all duration-200",
                pathname === route.href 
                  ? "bg-slate-200/50 dark:bg-slate-800/50 text-slate-900 dark:text-white" 
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50",
                isCollapsed ? "justify-center" : "justify-start"
              )}
              title={isCollapsed ? route.label : undefined}
            >
              <div className={cn("flex items-center", isCollapsed ? "justify-center" : "flex-1")}>
                <route.icon className={cn("h-5 w-5", route.color, !isCollapsed && "mr-3")} />
                {!isCollapsed && <span className="truncate">{route.label}</span>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
