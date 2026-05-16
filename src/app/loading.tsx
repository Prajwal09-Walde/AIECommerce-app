"use client";

import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-24 h-24 border-t-2 border-indigo-600 rounded-full animate-spin"></div>
          <div className="absolute w-16 h-16 border-t-2 border-amber-500 rounded-full animate-spin animation-delay-150 direction-reverse"></div>
          <Loader2 className="w-8 h-8 text-amber-500 animate-pulse" />
        </div>
        <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-amber-500 animate-pulse mt-4">
          Loading Analytics...
        </h2>
      </div>
    </div>
  );
}
