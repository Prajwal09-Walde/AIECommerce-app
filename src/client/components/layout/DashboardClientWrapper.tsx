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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="h-screen relative flex overflow-hidden bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100 transition-colors">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[90] md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar Container */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-[100] h-full transition-all duration-300 ease-in-out md:flex md:flex-col md:z-[80]",
          isMobileMenuOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0",
          isCollapsed ? "md:w-20" : "md:w-72"
        )}
      >
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      </div>

      <main 
        className={cn(
          "flex-1 flex flex-col h-full w-full overflow-hidden transition-all duration-300 ease-in-out",
          isCollapsed ? "md:pl-20" : "md:pl-72"
        )}
      >
        {/* Mobile Header Bar & Desktop Header Wrapper */}
        <div className="flex w-full items-center bg-background border-b z-[70] relative">
          <button 
            onClick={() => setIsMobileMenuOpen(true)} 
            className="md:hidden p-4 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
          </button>
          <div className="flex-1">{header}</div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative w-full">
          {children}
        </div>
        {chat}
        {command}
        {toaster}
      </main>
    </div>
  );
};
