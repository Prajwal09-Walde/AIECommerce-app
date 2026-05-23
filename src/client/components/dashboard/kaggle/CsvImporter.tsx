"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, CheckCircle, AlertCircle, Loader2, Trash2, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface KaggleCsvImporterProps {
  onSuccess: () => void;
}

export const KaggleCsvImporter: React.FC<KaggleCsvImporterProps> = ({ onSuccess }) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [clearExisting, setClearExisting] = useState(true);
  const [distribute, setDistribute] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Safe CSV parser that handles quotes and commas inside fields
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith(".csv")) {
      toast({
        title: "Invalid file format",
        description: "Please select a standard .csv e-commerce dataset file.",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    setIsParsing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r\n|\n/);
        
        if (lines.length <= 1) {
          throw new Error("The CSV file seems to be empty or lacks columns.");
        }

        const headers = parseCSVLine(lines[0]);
        console.log("Detected CSV headers:", headers);

        // Simple validation of required headers
        const requiredHeaders = ["User_ID", "Product_ID", "Category", "Price", "Discount (%)", "Final_Price", "Payment_Method", "Purchase_Date"];
        const missing = requiredHeaders.filter(
          (h) => !headers.some((header) => header.toLowerCase().replace(/\s+/g, "") === h.toLowerCase().replace(/\s+/g, ""))
        );

        if (missing.length > 0) {
          toast({
            title: "Header Mismatch Warning",
            description: `Some columns might be mapped differently. Proceed with caution. Missing: ${missing.join(", ")}`,
            variant: "default",
          });
        }

        const data: any[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) continue;
          
          const values = parseCSVLine(line);
          const row: any = {};
          
          headers.forEach((header, index) => {
            // Standardize column keys to map easily on the backend
            let key = header;
            if (header.toLowerCase().replace(/\s+/g, "") === "user_id") key = "User_ID";
            else if (header.toLowerCase().replace(/\s+/g, "") === "product_id") key = "Product_ID";
            else if (header.toLowerCase().replace(/\s+/g, "") === "category") key = "Category";
            else if (header.toLowerCase().replace(/\s+/g, "") === "price") key = "Price";
            else if (header.toLowerCase().replace(/[\s(%)]+/g, "") === "discount") key = "Discount (%)";
            else if (header.toLowerCase().replace(/\s+/g, "") === "final_price") key = "Final_Price";
            else if (header.toLowerCase().replace(/\s+/g, "") === "payment_method") key = "Payment_Method";
            else if (header.toLowerCase().replace(/\s+/g, "") === "purchase_date") key = "Purchase_Date";
            
            row[key] = values[index] || "";
          });
          data.push(row);
        }

        setParsedData(data);
        toast({
          title: "File parsed successfully!",
          description: `Loaded ${data.length} transactions. Ready for ingestion.`,
          variant: "success",
        });
      } catch (err: any) {
        toast({
          title: "Error parsing CSV",
          description: err.message,
          variant: "destructive",
        });
        setFile(null);
      } finally {
        setIsParsing(false);
      }
    };

    reader.readAsText(selectedFile);
  };

  const handleUpload = async () => {
    if (parsedData.length === 0) return;

    setIsUploading(true);
    setProgress(0);

    const BATCH_SIZE = 500;
    const totalBatches = Math.ceil(parsedData.length / BATCH_SIZE);
    let successCount = 0;

    try {
      for (let i = 0; i < totalBatches; i++) {
        const start = i * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, parsedData.length);
        const chunk = parsedData.slice(start, end);

        // Clear existing transactions ONLY on the first batch, if requested
        const clearParam = clearExisting && i === 0 ? "clear=true" : "clear=false";
        const distributeParam = distribute ? "distribute=true" : "distribute=false";
        
        const response = await fetch(`/api/kaggle-transactions?${clearParam}&${distributeParam}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ transactions: chunk }),
        });

        const resData = await response.json();

        if (!response.ok) {
          throw new Error(resData.error || `Failed to ingest batch ${i + 1}`);
        }

        successCount += resData.insertedCount;
        setProgress(Math.round(((i + 1) / totalBatches) * 100));
      }

      toast({
        title: distribute ? "Ingestion & Seeding Complete! 🚀" : "Ingestion complete!",
        description: distribute
          ? `Successfully stored ${successCount} transactions and seeded the Products and Orders collections!`
          : `Successfully stored ${successCount} transactions in the database.`,
        variant: "success",
      });

      // Clear local states
      setFile(null);
      setParsedData([]);
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Ingestion error occurred",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const clearFile = () => {
    setFile(null);
    setParsedData([]);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm max-w-xl mx-auto">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Kaggle E-Commerce Data Importer</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Upload the `e-commerce-dataset.csv` file from Steve1215rogg
          </p>
        </div>
      </div>

      {!file ? (
        <div
          onClick={triggerFileInput}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              processFile(e.dataTransfer.files[0]);
            }
          }}
          className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group bg-slate-50/50 dark:bg-slate-950/20"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="hidden"
          />
          <UploadCloud className="w-12 h-12 text-slate-400 dark:text-slate-600 group-hover:text-indigo-500 transition-colors mb-3" />
          <p className="font-medium text-sm text-slate-700 dark:text-slate-300">
            Drag & drop your CSV file here, or <span className="text-indigo-500 underline">browse</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">Supports standard CSV files up to 20MB</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950/30 rounded-lg border border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="p-2 bg-emerald-500/10 rounded text-emerald-500 flex-shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {(file.size / 1024).toFixed(1)} KB • {parsedData.length} records parsed
                </p>
              </div>
            </div>
            {!isUploading && (
              <button
                type="button"
                onClick={clearFile}
                className="text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors flex items-center justify-center"
                title="Remove file"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Configuration Checkbox */}
          <div className="flex items-center space-x-2 text-sm bg-slate-50 dark:bg-slate-950/20 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
            <input
              type="checkbox"
              id="clearExisting"
              checked={clearExisting}
              disabled={isUploading}
              onChange={(e) => setClearExisting(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
            />
            <label htmlFor="clearExisting" className="text-slate-600 dark:text-slate-400 select-none cursor-pointer">
              Clear previous transactions from database before importing
            </label>
          </div>

          {/* Distribution Checkbox */}
          <div className="flex flex-col space-y-2 bg-slate-50 dark:bg-slate-950/20 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                id="distribute"
                checked={distribute}
                disabled={isUploading}
                onChange={(e) => setDistribute(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <label htmlFor="distribute" className="text-slate-600 dark:text-slate-400 select-none cursor-pointer font-medium">
                Distribute records into core collections (Products & Orders)
              </label>
            </div>
            {distribute && (
              <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded border border-amber-500/25 mt-1 animate-in fade-in duration-200">
                ⚠️ <b>Warning:</b> This will populate the live Product list and Orders collection. If "Clear previous transactions" is checked, existing orders/products will be reset to synchronize cleanly. Recommended for robust RAG analysis testing!
              </div>
            )}
          </div>

          {/* Action or Progress Panel */}
          {isUploading ? (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-500">
                <span className="flex items-center">
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5 text-indigo-500" />
                  Storing transactions in database...
                </span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleUpload}
              disabled={isParsing || parsedData.length === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg shadow-md transition-colors text-sm"
            >
              Start Database Ingestion ({parsedData.length} records)
            </button>
          )}
        </div>
      )}
    </div>
  );
};
