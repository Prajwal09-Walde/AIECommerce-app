"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { cn } from "@/lib/utils";

interface DashboardClientWrapperProps {
  header: React.ReactNode;
  children: React.ReactNode;
  command: React.ReactNode;
  toaster: React.ReactNode;
}

export const DashboardClientWrapper = ({
  header,
  children,
  command,
  toaster
}: DashboardClientWrapperProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="h-screen relative flex overflow-hidden bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100 transition-colors">
      <main className="flex-1 flex flex-col h-full w-full overflow-hidden transition-all duration-300 ease-in-out">
        {/* Desktop & Mobile Header Wrapper */}
        <div className="flex w-full items-center bg-background border-b z-[70] relative">
          <div className="flex-1">{header}</div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative w-full">
          {children}
        </div>
        {command}
        {toaster}
      </main>
    </div>
  );
};
