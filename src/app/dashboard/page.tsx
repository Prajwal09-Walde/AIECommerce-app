"use client";

import React, { useState, useMemo, useRef, useTransition, useEffect } from "react";
import { 
  DollarSign, 
  Users, 
  CreditCard, 
  Activity, 
  Database, 
  Loader2, 
  UploadCloud, 
  Trash2, 
  CheckCircle, 
  TrendingUp, 
  Sparkles, 
  Package, 
  Tag, 
  Layers, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  RefreshCw,
  ShoppingBag,
  Brain,
  Play,
  CheckCircle2,
  Terminal,
  AlertTriangle,
  FileText,
  Bookmark,
  CheckSquare,
  Square,
  AlertCircle,
  Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { useKaggleData } from "@/hooks/use-kaggle-data";
import { 
  calculateOverview, 
  calculateCustomers, 
  calculateProducts, 
  calculateForecasting 
} from "@/client/utils/data-processor";
import { runAutomatedRAGAnalysis } from "@/actions/rag-actions";
import { useToast } from "@/hooks/use-toast";

// Recharts components
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from "recharts";

// ag-Grid components
import { AgGridReact } from "ag-grid-react";
import { ColDef } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

const MotionCard = motion(Card);

// Preset contexts for RAG analysis
const PRESETS = [
  {
    title: "Competitor Strategy & Clearance",
    focus: "Inventory Clearance & Competitor Pricing Match",
    text: `COMPETITOR STRATEGY GUIDELINE Q2:
- TechStop is pricing Noise Cancelling Headphones at $220. We must beat them by matching our price if stock is low or matching standard sales.
- Our Ergonomic Office Chair is valued high but is slow moving. We want to apply a 15% discount to clear furniture inventory and improve capital turnover.
- Accessories categories have massive margins (>60%). Boost water bottle sales with bundle packages.
- If we have low-stock warnings (less than 10 units), we must automatically raise restock orders or increase margins by 5% temporarily.`
  },
  {
    title: "Summer Sales Expansion Goals",
    focus: "Revenue Scaling & Customer Engagement",
    text: `SUMMER CAMPAIGN RULES 2026:
- Maximize Average Order Value (AOV) by pushing high-tier items like the Mechanical Keyboard V2 and Smart Watch Series 5.
- Encourage a 10% coupon promotion to active John Doe and Jane Smith premium profiles to convert processing orders to Shipped fast.
- Promote cross-category packages: Electronics with Accessories.
- Maintain stock buffer of at least 20 units for high-velocity electronics items.`
  },
  {
    title: "Supply Chain & Risk Audit",
    focus: "Low Stock Inventory Risk Vector Mitigation",
    text: `OPERATIONAL RISK COMPLIANCE POLICY:
- Every product with stock below 10 units represents a critical supply risk. Highlight noise-cancelling headphones and office chairs.
- High average order value items ($150+) require insured shipping standard policies.
- Limit accessory product stock levels if total value exceeds $5000 in inventory assets.
- Priority customer shipments must resolve in less than 24 hours under processing state.`
  }
];

export default function DashboardPage() {
  const { toast } = useToast();
  const { transactions, hasData, loading, uploadCSV, clearData } = useKaggleData();
  const [activeTab, setActiveTab] = useState("overview");

  // File parsing states
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search/Filters states
  const [orderSearch, setOrderSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productPage, setProductPage] = useState(1);
  const [customerSearch, setCustomerSearch] = useState("");

  // RAG Analyst specific states
  const [ragFocus, setRagFocus] = useState(PRESETS[0].focus);
  const [ragGuidelines, setRagGuidelines] = useState(PRESETS[0].text);
  const [isRAGPending, startRAGTransition] = useTransition();
  const [ragLogs, setRAGLogs] = useState<string[]>([]);
  const [ragActiveStep, setRAGActiveStep] = useState<number | null>(null);
  const [retrievedChunks, setRetrievedChunks] = useState<string[]>([]);
  const [ragAnalysis, setRAGAnalysis] = useState<any>(null);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});

  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll AI terminal console logs
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [ragLogs]);

  const toggleTask = (taskName: string) => {
    setCompletedTasks(prev => ({
      ...prev,
      [taskName]: !prev[taskName]
    }));
  };

  // In-Memory Data Computations
  const overviewStats = useMemo(() => calculateOverview(transactions), [transactions]);
  const customersStats = useMemo(() => calculateCustomers(transactions), [transactions]);
  const productsStats = useMemo(() => 
    calculateProducts(transactions, productPage, 12, productSearch), 
    [transactions, productPage, productSearch]
  );
  const forecastingStats = useMemo(() => calculateForecasting(transactions), [transactions]);

  // ag-Grid Column definitions for Orders Tab
  const orderColumnDefs = useMemo<ColDef[]>(() => [
    { field: "id", headerName: "Order ID", sortable: true, filter: true, width: 150 },
    { field: "customer", headerName: "Customer ID", sortable: true, filter: true, flex: 1.5 },
    { 
      field: "amount", 
      headerName: "Amount", 
      sortable: true, 
      filter: true, 
      width: 130,
      valueFormatter: (p) => `$${p.value.toFixed(2)}`
    },
    { field: "category", headerName: "Category", sortable: true, filter: true, width: 140 },
    { field: "paymentMethod", headerName: "Payment Method", sortable: true, filter: true, width: 160 },
    { 
      field: "region", 
      headerName: "Market Region", 
      sortable: true, 
      filter: true, 
      width: 160,
      valueGetter: (params) => {
        const pm = params.data.paymentMethod || "";
        if (pm.toLowerCase().includes("credit") || pm.toLowerCase().includes("card")) return "AMER (New York)";
        if (pm.toLowerCase().includes("paypal") || pm.toLowerCase().includes("bank")) return "EMEA (London)";
        return "APAC (Tokyo)";
      }
    },
    { 
      field: "purchaseDate", 
      headerName: "Purchase Date", 
      sortable: true, 
      filter: true, 
      flex: 1.2,
      valueFormatter: (p) => new Date(p.value).toLocaleString()
    },
  ], []);

  const ordersRowData = useMemo(() => {
    let list = transactions;
    if (orderSearch) {
      const q = orderSearch.toLowerCase();
      list = transactions.filter(t => 
        t.userId.toLowerCase().includes(q) || 
        t.productId.toLowerCase().includes(q) || 
        t.category.toLowerCase().includes(q)
      );
    }
    return list.map((t, idx) => ({ ...t, id: `ORD-${100000 + idx}` }));
  }, [transactions, orderSearch]);

  const filteredCustomers = useMemo(() => {
    if (!customersStats.topCustomers) return [];
    if (!customerSearch.trim()) return customersStats.topCustomers;
    return customersStats.topCustomers.filter((c: any) =>
      c.customer.toLowerCase().includes(customerSearch.toLowerCase())
    );
  }, [customersStats, customerSearch]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    setIsParsing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const count = uploadCSV(text);
        
        // Reset local views
        setProductPage(1);
        setProductSearch("");
        setOrderSearch("");
        setActiveTab("overview");
      } catch (err) {
        console.error(err);
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsText(file);
  };

  // RAG Analysis Runner
  const handleStartAnalysis = () => {
    setRAGLogs([]);
    setRAGAnalysis(null);
    setRetrievedChunks([]);
    setCompletedTasks({});
    
    const stepLogs = [
      "Initializing AI RAG retrieval pipeline...",
      "Binding database references...",
      "Extracting contextual product and transaction parameters...",
      "Fusing local in-memory dataset boundaries...",
    ];

    let timer = 0;
    stepLogs.forEach((log, index) => {
      setTimeout(() => {
        setRAGLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${log}`]);
        setRAGActiveStep(1);
      }, timer);
      timer += 400;
    });

    setTimeout(() => {
      startRAGTransition(async () => {
        setRAGActiveStep(2);
        setRAGLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Dynamic indexing active. Indexing business rules...`]);
        
        const result = await runAutomatedRAGAnalysis(ragFocus, ragGuidelines);
        
        if (result.success && result.analysis) {
          setRAGActiveStep(3);
          result.logs.forEach((bLog, bIdx) => {
            setTimeout(() => {
              setRAGLogs(prev => [...prev, bLog]);
            }, bIdx * 250);
          });

          setTimeout(() => {
            setRAGActiveStep(4);
            setRetrievedChunks(result.retrievedChunks || []);
            setRAGAnalysis(result.analysis);
            setRAGActiveStep(null);
            
            toast({
              title: "RAG Analysis Complete 🚀",
              description: "AI report generated directly from e-commerce records.",
              variant: "success",
            });
          }, (result.logs.length * 250) + 300);
        } else {
          setRAGActiveStep(null);
          const errorLog = result.error || "Gemini API limits reached or compilation failed.";
          setRAGLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] CRITICAL ERROR: ${errorLog}`]);
          toast({
            variant: "destructive",
            title: "Analysis Failed",
            description: errorLog,
          });
        }
      });
    }, timer);
  };

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setRagFocus(preset.focus);
    setRagGuidelines(preset.text);
    toast({
      title: "Guidelines Loaded",
      description: `Preset guidelines loaded for: "${preset.title}"`,
    });
  };

  if (loading || isParsing) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
        <p className="text-muted-foreground text-sm font-medium animate-pulse">Processing CSV ledger in-memory...</p>
      </div>
    );
  }

  // 1. Initial State: Elegant drag-and-drop CSV importer
  if (!hasData) {
    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
          <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-500 via-amber-500 to-rose-500 bg-clip-text text-transparent">
            E-Commerce SPA Analytics AI
          </h2>
          <p className="text-muted-foreground text-base max-w-lg mx-auto">
            Upload your e-commerce transactions CSV to instantly spin up premium charts, forecasting lines, ag-Grid ledgers, and AI Gemini analysis.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              processFile(e.dataTransfer.files[0]);
            }
          }}
          className="border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-3xl p-16 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group bg-white/40 dark:bg-slate-950/20 backdrop-blur-md shadow-xl hover:shadow-indigo-500/5"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="hidden"
          />
          <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-500 group-hover:scale-110 transition-transform mb-4">
            <UploadCloud className="w-12 h-12" />
          </div>
          <p className="font-bold text-lg text-slate-800 dark:text-slate-200">
            Drag & drop your e-commerce-dataset.csv file here
          </p>
          <p className="text-sm text-slate-400 mt-2">
            Or click to <span className="text-indigo-500 underline font-medium">browse local files</span>
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dynamic SPA Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/40 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">SPA Dashboard Overview</h2>
            <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-0.5 rounded-full text-xs font-bold border border-emerald-500/20">
              <Sparkles className="w-3 h-3 animate-pulse" />
              SPA Active
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ingested {transactions.length.toLocaleString()} CSV rows directly in browser memory.
          </p>
        </div>
        <button
          onClick={clearData}
          className="flex items-center justify-center gap-2 border bg-white hover:bg-red-50 dark:bg-slate-950 dark:hover:bg-red-950/20 border-slate-200 dark:border-slate-800 hover:border-red-500 dark:hover:border-red-900 text-slate-700 dark:text-slate-300 hover:text-red-500 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm"
        >
          <Trash2 className="w-4 h-4" />
          Reset Dataset
        </button>
      </div>

      {/* Modern SPA Tab Selector with ALL Sidebar options */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: "overview", label: "Overview", icon: DollarSign },
          { id: "orders", label: "Orders (ag-Grid)", icon: CreditCard },
          { id: "products", label: "Products", icon: Package },
          { id: "customers", label: "Customers", icon: Users },
          { id: "forecasting", label: "AI Forecasting", icon: TrendingUp },
          { id: "ai-analyst", label: "AI RAG Analyst", icon: Brain },
          { id: "alerts", label: "Alert Center", icon: AlertTriangle },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                active 
                  ? "bg-slate-900 dark:bg-white text-white dark:text-black shadow-md" 
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Render Dynamic Tab Views */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25 }}
        >
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-t-4 border-t-indigo-500 bg-white/50 dark:bg-black/50 backdrop-blur-md">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-indigo-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${overviewStats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    <p className="text-xs text-muted-foreground">Cumulative customer checkouts</p>
                  </CardContent>
                </Card>

                <Card className="border-t-4 border-t-amber-500 bg-white/50 dark:bg-black/50 backdrop-blur-md">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Unique Buyers</CardTitle>
                    <Users className="h-4 w-4 text-amber-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">+{overviewStats.uniqueCustomers.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Active customer profiles discovered</p>
                  </CardContent>
                </Card>

                <Card className="border-t-4 border-t-indigo-600 bg-white/50 dark:bg-black/50 backdrop-blur-md">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                    <CreditCard className="h-4 w-4 text-indigo-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">+{overviewStats.totalOrders.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Total successful checkout count</p>
                  </CardContent>
                </Card>

                <Card className="border-t-4 border-t-amber-400 bg-white/50 dark:bg-black/50 backdrop-blur-md">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Catalog SKUs</CardTitle>
                    <Activity className="h-4 w-4 text-amber-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">+{overviewStats.activeProducts.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Unique items parsed</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-7">
                <Card className="col-span-4 bg-white/50 dark:bg-black/50 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle>Daily Category Sales Streams</CardTitle>
                  </CardHeader>
                  <CardContent className="pl-2">
                    <div className="w-full h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={overviewStats.dailySalesTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <XAxis dataKey="time" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                          <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: '12px', border: 'none', color: '#fff' }} />
                          <Area type="monotone" dataKey="Electronics" stroke="#6366f1" fillOpacity={0.25} fill="url(#colorIndigo)" name="Electronics" stackId="1" />
                          <Area type="monotone" dataKey="Clothing" stroke="#f59e0b" fillOpacity={0.25} fill="url(#colorAmber)" name="Clothing" stackId="1" />
                          <Area type="monotone" dataKey="Home" stroke="#10b981" fillOpacity={0.25} fill="#10b981" name="Home" stackId="1" />
                          <Area type="monotone" dataKey="Books" stroke="#06b6d4" fillOpacity={0.25} fill="#06b6d4" name="Books" stackId="1" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="col-span-3 bg-white/50 dark:bg-black/50 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle>Recent Sales Ledger</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {overviewStats.recentSales.map((sale: any) => (
                        <div key={sale.id} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate w-40">{sale.customer}</p>
                            <p className="text-xs text-muted-foreground">Transaction Date: {sale.date}</p>
                          </div>
                          <span className="text-sm font-bold text-indigo-500 dark:text-amber-500">
                            +${sale.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 2: ORDERS */}
          {activeTab === "orders" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-3 justify-between bg-white/40 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 backdrop-blur-md">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="search"
                    placeholder="Search in-memory orders by Customer..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="pl-9 h-9 w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div className="text-xs text-muted-foreground font-semibold">
                  Filtered {ordersRowData.length.toLocaleString()} of {transactions.length.toLocaleString()} entries
                </div>
              </div>

              <div className="ag-theme-alpine w-full h-[580px] shadow-xl border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <AgGridReact
                  rowData={ordersRowData}
                  columnDefs={orderColumnDefs}
                  defaultColDef={{ resizable: true }}
                  animateRows={true}
                  pagination={true}
                  paginationPageSize={20}
                />
              </div>
            </div>
          )}

          {/* TAB 3: PRODUCTS */}
          {activeTab === "products" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-3 justify-between bg-white/40 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 backdrop-blur-md">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="search"
                    placeholder="Search products by Name/Category..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setProductPage(1);
                    }}
                    className="pl-8 h-9 w-full rounded-md border border-slate-300 dark:border-slate-800 bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                  />
                </div>
                <div className="text-xs text-muted-foreground font-semibold">
                  Found {productsStats.total.toLocaleString()} catalog products
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {productsStats.products.length === 0 ? (
                  <div className="col-span-full py-20 text-center text-slate-400 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50/10">
                    No matching products found in the catalog.
                  </div>
                ) : (
                  productsStats.products.map((product: any) => (
                    <Card key={product._id} className="relative bg-white/50 dark:bg-black/50 backdrop-blur-md border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold truncate pr-6">{product.name}</CardTitle>
                        <Package className="h-5 w-5 text-indigo-500 opacity-20 absolute top-4 right-4" />
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center text-sm">
                          <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span className="font-medium mr-2">Category:</span>
                          <span className="text-muted-foreground">{product.category}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <DollarSign className="mr-2 h-4 w-4 text-green-600" />
                          <span className="font-medium mr-2">Price:</span>
                          <span className="text-green-600 font-bold">${product.price?.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Layers className="mr-2 h-4 w-4 text-amber-500" />
                          <span className="font-medium mr-2">Stock Level:</span>
                          <span className="text-muted-foreground">{product.stock} units</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* In-Memory Product Pagination */}
              {productsStats.totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => setProductPage(p => Math.max(1, p - 1))}
                    disabled={productPage === 1}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <span className="text-sm font-semibold text-slate-500">
                    Page {productPage} of {productsStats.totalPages}
                  </span>
                  <button
                    onClick={() => setProductPage(p => Math.min(productsStats.totalPages, p + 1))}
                    disabled={productPage >= productsStats.totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CUSTOMERS */}
          {activeTab === "customers" && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-white/50 dark:bg-black/50 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle>Customer Segmentation</CardTitle>
                    <CardDescription>Visualizing buying power based on LTV tiers</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={customersStats.segmentData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {customersStats.segmentData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: '12px', border: 'none', color: '#fff' }} />
                        <Legend verticalAlign="bottom" iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="bg-white/50 dark:bg-black/50 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle>Checkout Channel Breakdown</CardTitle>
                    <CardDescription>Payment methods breakdown dynamically populated</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={customersStats.paymentData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {customersStats.paymentData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: '12px', border: 'none', color: '#fff' }} />
                        <Legend verticalAlign="bottom" iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-white/50 dark:bg-black/50 backdrop-blur-md">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Top Spenders Directory</CardTitle>
                    <CardDescription>Aggregated LTV spend directory of checkout accounts</CardDescription>
                  </div>
                  <div className="relative w-full sm:w-80">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="search"
                      placeholder="Search customers..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-8 h-9 w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-900/60 font-semibold">
                        <tr>
                          <th className="px-6 py-3">Customer ID / Email</th>
                          <th className="px-6 py-3">Order Counts</th>
                          <th className="px-6 py-3">Lifetime Value (LTV)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {filteredCustomers.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                              No customer spend entries found.
                            </td>
                          </tr>
                        ) : (
                          filteredCustomers.map((c: any, idx: number) => (
                            <tr key={c.customer || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                              <td className="px-6 py-4 font-mono text-xs text-indigo-600 dark:text-indigo-400">{c.customer}</td>
                              <td className="px-6 py-4">{c.orderCount} checkouts</td>
                              <td className="px-6 py-4 font-bold">${c.ltv.toFixed(2)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 5: AI FORECASTING */}
          {activeTab === "forecasting" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Real-Time In-Memory Forecasting</h3>
                  <p className="text-sm text-slate-400">
                    Renders daily revenue timelines and projects next periods using a Linear Regression line equation.
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3.5 py-1.5 rounded-full text-xs font-bold border border-emerald-500/20">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Forecaster Active
                </div>
              </div>

              {!forecastingStats.hasData ? (
                <div className="py-20 text-center text-slate-400 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50/10">
                  Not enough historical dates to generate regression. Add at least 3 separate purchase dates!
                </div>
              ) : (
                <Card className="w-full bg-white/50 dark:bg-black/50 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl">
                  <CardHeader>
                    <CardTitle>Historical & Predictive Revenue Timeline</CardTitle>
                    <CardDescription>Renders 15 historical periods and forecasts the next 6 chronological periods</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={forecastingStats.data} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                        <XAxis dataKey="time" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toLocaleString()}`} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: '12px', border: 'none', color: '#fff' }} />
                        <Legend verticalAlign="top" height={36} iconType="circle" />
                        <Line 
                          type="monotone" 
                          dataKey="actual" 
                          stroke="#6366f1" 
                          strokeWidth={3.5} 
                          name="Actual Daily Revenue" 
                          dot={{ stroke: '#6366f1', strokeWidth: 1.5, r: 3 }}
                          activeDot={{ r: 5, strokeWidth: 0 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="forecast" 
                          stroke="#10b981" 
                          strokeWidth={3.5} 
                          strokeDasharray="6 6" 
                          name="AI Prediction Trend" 
                          dot={{ stroke: '#10b981', strokeWidth: 1.5, r: 3 }}
                          activeDot={{ r: 5, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* TAB 6: AI RAG ANALYST */}
          {activeTab === "ai-analyst" && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Brain className="h-6 w-6 text-amber-500 animate-pulse" />
                    AI RAG Automated Analyst
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Analyzes live in-memory store metrics, indexes custom guidelines, and returns automated reports.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleApplyPreset(p)}
                      className="flex items-center gap-1 bg-white dark:bg-black hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition"
                    >
                      <Bookmark className="mr-1 h-3 w-3 text-indigo-500" />
                      {p.title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                {/* Rule configuration panel */}
                <div className="lg:col-span-1 space-y-4">
                  <Card className="border-t-4 border-t-amber-500 bg-white/40 dark:bg-black/40 backdrop-blur-md shadow-lg">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Database className="h-4.5 w-4.5 text-amber-500" />
                        Interactive Context Augmentation
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-xs">
                      <div className="space-y-2">
                        <label className="font-semibold text-slate-500">Analysis Goal/Focus</label>
                        <input
                          type="text"
                          value={ragFocus}
                          onChange={(e) => setRagFocus(e.target.value)}
                          placeholder="e.g. price optimization"
                          className="w-full text-xs bg-slate-50 dark:bg-slate-950 border rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-amber-500 transition"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="font-semibold text-slate-500 flex items-center justify-between">
                          <span>Operational Policies</span>
                          <span className="text-[10px] text-indigo-500 font-normal">Vector search augments context</span>
                        </label>
                        <textarea
                          value={ragGuidelines}
                          onChange={(e) => setRagGuidelines(e.target.value)}
                          rows={8}
                          className="w-full text-[11px] bg-slate-50 dark:bg-slate-950 border rounded-md p-3 outline-none focus:ring-1 focus:ring-amber-500 transition font-mono"
                        />
                      </div>

                      <button
                        onClick={handleStartAnalysis}
                        disabled={isRAGPending || !ragFocus.trim()}
                        className="w-full bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-bold flex items-center justify-center gap-2 py-2 rounded-xl shadow-lg transition disabled:opacity-50"
                      >
                        {isRAGPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            RAG Analysis Executing...
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 fill-current" />
                            Run AI RAG Analysis
                          </>
                        )}
                      </button>
                    </CardContent>
                  </Card>
                </div>

                {/* Console execution monitor */}
                <div className="lg:col-span-2 space-y-4">
                  <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-md shadow-lg border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Terminal className="h-4.5 w-4.5 text-indigo-500" />
                        Live RAG Pipeline Execution Flow
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-2 relative mb-4">
                        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-indigo-500/10 -translate-y-1/2 -z-10" />
                        {[
                          { step: 1, label: "Ingest Docs", icon: Database },
                          { step: 2, label: "Index Vector", icon: FileText },
                          { step: 3, label: "Retrieve Context", icon: Brain },
                          { step: 4, label: "Synthesize", icon: Sparkles },
                        ].map((s) => {
                          const StepIcon = s.icon;
                          const active = ragActiveStep === s.step;
                          return (
                            <div key={s.step} className={`flex flex-col items-center p-2 rounded-lg border text-center ${
                              active ? "bg-indigo-500/10 border-indigo-500 animate-pulse" : "bg-slate-50/20 dark:bg-slate-900/10 border-transparent"
                            }`}>
                              <StepIcon className={`h-5 w-5 mb-1 ${active ? "text-indigo-500" : "text-slate-400"}`} />
                              <span className="text-[9px] font-bold">{s.label}</span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="rounded-lg border bg-slate-950 p-4 text-[11px] font-mono text-emerald-400 h-[170px] overflow-y-auto relative">
                        <div className="absolute top-2 right-3 flex items-center gap-1.5 text-[9px] text-slate-500">
                          LOGS ACTIVE
                        </div>
                        <div className="space-y-1.5">
                          {ragLogs.length === 0 && (
                            <div className="text-slate-500 italic">
                              Ready for execution. Guidelines rules will be chunked, filtered by relevance query focus, and combined with store aggregates to create custom analysis.
                            </div>
                          )}
                          {ragLogs.map((log, i) => <div key={i}>{log}</div>)}
                          {isRAGPending && (
                            <div className="text-indigo-400 animate-pulse flex items-center gap-2 mt-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping" />
                              Connecting Gemini-2.5-Flash intelligence core...
                            </div>
                          )}
                          <div ref={consoleEndRef} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* RAG Synthesis Result Dashboard Output */}
              <AnimatePresence>
                {ragAnalysis && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    {retrievedChunks.length > 0 && (
                      <div className="p-4 rounded-lg bg-indigo-500/5 border border-indigo-500/10 backdrop-blur-md">
                        <h4 className="text-xs font-bold text-indigo-400 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                          <Bookmark className="h-3.5 w-3.5" />
                          RAG Injected Knowledge Chunks
                        </h4>
                        <div className="grid gap-2 sm:grid-cols-3">
                          {retrievedChunks.map((chunk, idx) => (
                            <div key={idx} className="p-2 text-[10px] bg-slate-900/40 border border-slate-800 rounded text-slate-300 italic font-mono leading-relaxed">
                              "{chunk.slice(0, 150)}..."
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-5">
                      {[
                        { title: "Indexed Revenue", val: ragAnalysis.kpis.totalRevenue, sub: "Calculated sales value", icon: DollarSign, color: "border-t-indigo-500" },
                        { title: "Active Orders", val: ragAnalysis.kpis.totalOrders, sub: "Completed purchases", icon: ShoppingBag, color: "border-t-amber-500" },
                        { title: "Average Ticket", val: ragAnalysis.kpis.averageOrderValue, sub: "Order basket size", icon: TrendingUp, color: "border-t-violet-500" },
                        { title: "Low Stock Risks", val: ragAnalysis.kpis.lowStockAlerts, sub: "Items below buffer stock", icon: AlertTriangle, color: "border-t-rose-500" },
                        { title: "Registered Buyers", val: ragAnalysis.kpis.activeUsers, sub: "Active customer IDs", icon: Users, color: "border-t-emerald-500" },
                      ].map((card, idx) => (
                        <Card key={idx} className={`border-t-4 bg-white/40 dark:bg-black/40 backdrop-blur-md shadow ${card.color}`}>
                          <CardHeader className="flex flex-row items-center justify-between pb-1">
                            <CardTitle className="text-xs font-semibold">{card.title}</CardTitle>
                            <card.icon className="h-4 w-4 text-slate-500" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-xl font-bold">{card.val}</div>
                            <p className="text-[9px] text-muted-foreground">{card.sub}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-md shadow-xl border border-indigo-500/10">
                      <CardHeader>
                        <CardTitle className="text-base font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                          <Sparkles className="h-4.5 w-4.5" />
                          Executive RAG Strategic Insights
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 text-xs leading-relaxed">
                        <p className="p-3 bg-indigo-500/5 border border-indigo-500/10 text-slate-800 dark:text-slate-200 rounded-lg">
                          {ragAnalysis.summary}
                        </p>
                        <div className="grid gap-4 md:grid-cols-2">
                          {ragAnalysis.sections.map((sec: any, idx: number) => (
                            <div key={idx} className="p-3 rounded-lg border bg-slate-50/40 dark:bg-slate-900/40">
                              <h5 className="font-bold text-indigo-600 dark:text-indigo-400 mb-1 border-b pb-1 flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500" />
                                {sec.title}
                              </h5>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400">{sec.content}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <div className="grid gap-6 md:grid-cols-2">
                      <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-md">
                        <CardHeader>
                          <CardTitle className="text-sm font-bold">RAG SWOT Strategic Matrix</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-2 text-[10px]">
                          {[
                            { key: "strengths", title: "STRENGTHS", bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" },
                            { key: "weaknesses", title: "WEAKNESSES", bg: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400" },
                            { key: "opportunities", title: "OPPORTUNITIES", bg: "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400" },
                            { key: "threats", title: "THREATS", bg: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400" },
                          ].map((x) => (
                            <div key={x.key} className={`p-2.5 rounded-lg border ${x.bg}`}>
                              <span className="font-extrabold block mb-1">{x.title}</span>
                              <ul className="list-disc pl-3 space-y-0.5 text-slate-800 dark:text-slate-200">
                                {ragAnalysis.swot[x.key].map((item: string, i: number) => <li key={i}>{item}</li>)}
                              </ul>
                            </div>
                          ))}
                        </CardContent>
                      </Card>

                      <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-md">
                        <CardHeader>
                          <CardTitle className="text-sm font-bold">Recommended Action Checklist Roadmap</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {ragAnalysis.actionableSteps.map((step: any, idx: number) => {
                            const isCompleted = !!completedTasks[step.task];
                            return (
                              <div
                                key={idx}
                                onClick={() => toggleTask(step.task)}
                                className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition text-[11px] ${
                                  isCompleted ? "bg-slate-100 dark:bg-slate-900/30 opacity-60" : "bg-white/50 dark:bg-black/30 border-slate-200 dark:border-slate-800"
                                }`}
                              >
                                {isCompleted ? <CheckSquare className="h-4.5 w-4.5 text-emerald-500" /> : <Square className="h-4.5 w-4.5 text-indigo-500" />}
                                <div className="flex-1">
                                  <div className="flex items-center justify-between font-semibold">
                                    <span className={isCompleted ? "line-through text-slate-500" : "text-slate-900 dark:text-slate-100"}>{step.task}</span>
                                    <span className="text-[8px] font-bold uppercase">{step.priority}</span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">{step.reason}</p>
                                </div>
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* TAB 7: ALERT CENTER */}
          {activeTab === "alerts" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold">Alert Operational Center</h3>
                <p className="text-sm text-slate-400">
                  System notifications, automated anomaly indicators, and data alerts.
                </p>
              </div>

              <div className="space-y-4">
                <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/30">
                  <CardContent className="flex items-center p-4">
                    <AlertCircle className="h-6 w-6 text-red-500 mr-4" />
                    <div>
                      <p className="font-semibold text-red-800 dark:text-red-400">Abnormal Revenue Drop Detected</p>
                      <p className="text-sm text-red-600 dark:text-red-300">Daily sales dropped compared to chronological averages. Audit pricing match filters.</p>
                    </div>
                    <div className="ml-auto text-xs text-red-500">10 mins ago</div>
                  </CardContent>
                </Card>

                <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900/30">
                  <CardContent className="flex items-center p-4">
                    <AlertTriangle className="h-6 w-6 text-yellow-500 mr-4" />
                    <div>
                      <p className="font-semibold text-yellow-800 dark:text-yellow-400">Low Inventory Warnings</p>
                      <p className="text-sm text-yellow-600 dark:text-yellow-300">Determined 4 high-value products in-memory are below safe stock levels.</p>
                    </div>
                    <div className="ml-auto text-xs text-yellow-500">2 hours ago</div>
                  </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900/30">
                  <CardContent className="flex items-center p-4">
                    <Info className="h-6 w-6 text-blue-500 mr-4" />
                    <div>
                      <p className="font-semibold text-blue-800 dark:text-blue-400">In-Memory SPA Environment Deploy Complete</p>
                      <p className="text-sm text-blue-600 dark:text-blue-300">All metrics computations have successfully bypassed API layers and run fully client-side.</p>
                    </div>
                    <div className="ml-auto text-xs text-blue-500">1 day ago</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
