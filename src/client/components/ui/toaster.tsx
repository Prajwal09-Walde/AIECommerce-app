"use client";

import { useToastStore } from "@/hooks/use-toast";
import { AnimatePresence, motion } from "framer-motion";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";

export function Toaster() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px] gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(({ id, title, description, variant }) => (
          <motion.div
            key={id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all ${
              variant === "destructive" 
                ? "bg-red-600 text-white border-red-600" 
                : variant === "success" 
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-background text-foreground border-border"
            }`}
          >
            <div className="flex items-start gap-4">
              {variant === "success" && <CheckCircle2 className="h-5 w-5 mt-0.5" />}
              {variant === "destructive" && <AlertCircle className="h-5 w-5 mt-0.5" />}
              {(!variant || variant === "default") && <Info className="h-5 w-5 mt-0.5 text-blue-500" />}
              
              <div className="grid gap-1">
                {title && <div className="text-sm font-semibold">{title}</div>}
                {description && <div className="text-sm opacity-90">{description}</div>}
              </div>
            </div>
            
            <button
              onClick={() => dismiss(id)}
              className="absolute right-2 top-2 rounded-md p-1 opacity-50 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
