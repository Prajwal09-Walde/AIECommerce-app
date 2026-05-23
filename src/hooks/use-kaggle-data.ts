"use client";

import { useState, useEffect } from "react";
import { parseCSV } from "@/client/utils/data-processor";

export function useKaggleData() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync state with localStorage on mount
  useEffect(() => {
    const cached = localStorage.getItem("kaggle_transactions");
    if (cached) {
      try {
        setTransactions(JSON.parse(cached));
      } catch (e) {
        console.error("Failed to parse cached transactions:", e);
      }
    }
    setLoading(false);
  }, []);

  // Set parsed transactions in state and localStorage
  const uploadCSV = (rawText: string) => {
    setLoading(true);
    const parsed = parseCSV(rawText);
    if (parsed.length > 0) {
      try {
        localStorage.setItem("kaggle_transactions", JSON.stringify(parsed));
        setTransactions(parsed);
      } catch (e) {
        console.error("Failed to cache transactions in localStorage:", e);
        // Fallback: set in memory only if localStorage quota is exceeded
        setTransactions(parsed);
      }
    }
    setLoading(false);
    return parsed.length;
  };

  // Clear data state
  const clearData = () => {
    localStorage.removeItem("kaggle_transactions");
    setTransactions([]);
  };

  return {
    transactions,
    hasData: transactions.length > 0,
    loading,
    uploadCSV,
    clearData,
  };
}
export default useKaggleData;
