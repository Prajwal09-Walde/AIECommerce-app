"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { cn } from "@/lib/utils";

interface DashboardClientWrapperProps {
  header: React.ReactNode;
  children: React.ReactNode;
  chat: React.ReactNode;
  command: React.ReactNode;
  toaster: React.ReactNode;
}

export const DashboardClientWrapper = ({
  header,
  children,
  chat,
  command,
  toaster
}: DashboardClientWrapperProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="h-screen relative flex overflow-hidden bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100 transition-colors">
      <div 
        className={cn(
          "hidden h-full md:flex md:flex-col md:fixed md:inset-y-0 z-[80] transition-all duration-300 ease-in-out",
          isCollapsed ? "md:w-20" : "md:w-72"
        )}
      >
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      </div>
      <main 
        className={cn(
          "flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out",
          isCollapsed ? "md:pl-20" : "md:pl-72"
        )}
      >
        {header}
        <div className="flex-1 overflow-y-auto p-8 relative">
          {children}
        </div>
        {chat}
        {command}
        {toaster}
      </main>
    </div>
  );
};
