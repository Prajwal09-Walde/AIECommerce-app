"use client";

import { useState, useEffect, useRef } from "react";

export function useKaggleData() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamSpeed, setStreamSpeed] = useState(0.2); // seconds per transaction
  const [loading, setLoading] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Stop stream on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const clearData = async () => {
    setLoading(true);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    try {
      await fetch("http://localhost:8000/api/reset/", {
        method: "POST"
      });
    } catch (e) {
      console.error("Failed to reset Django database:", e);
    }
    
    localStorage.removeItem("kaggle_transactions");
    setTransactions([]);
    setIsStreaming(false);
    setLoading(false);
  };

  const startStreaming = async (speedVal: number = 0.2) => {
    setLoading(true);
    try {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      setTransactions([]);
      setIsStreaming(true);

      const streamUrl = `http://localhost:8000/api/stream/?speed=${speedVal}`;
      const es = new EventSource(streamUrl);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const t = JSON.parse(event.data);
          setTransactions((prev) => [...prev, t]);
        } catch (e) {
          console.error("Error parsing stream transaction event:", e);
        }
      };

      es.addEventListener("start", () => {
        setTransactions([]);
        setIsStreaming(true);
      });

      es.addEventListener("end", () => {
        setIsStreaming(false);
        es.close();
      });

      es.onerror = (err) => {
        console.error("EventSource stream connection error:", err);
        setIsStreaming(false);
        es.close();
      };

    } catch (e) {
      console.error("Stream error:", e);
      setIsStreaming(false);
    } finally {
      setLoading(false);
    }
  };

  return {
    transactions,
    hasData: transactions.length > 0,
    isStreaming,
    streamSpeed,
    setStreamSpeed,
    loading,
    startStreaming,
    clearData,
  };
}

export default useKaggleData;
