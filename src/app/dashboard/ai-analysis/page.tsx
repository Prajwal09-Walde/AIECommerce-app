"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { runAutomatedRAGAnalysis } from "@/actions/rag-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Brain, 
  Database, 
  Play, 
  CheckCircle2, 
  Sparkles, 
  Loader2, 
  Terminal, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  DollarSign, 
  ShoppingCart,
  FileText,
  Bookmark,
  CheckSquare,
  Square
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

// Preset contexts to let the user easily try different business constraints
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

export default function AIAnalysisPage() {
  const { toast } = useToast();
  const [focus, setFocus] = useState("Inventory Clearance & Competitor Pricing Match");
  const [customGuidelines, setCustomGuidelines] = useState(PRESETS[0].text);
  const [isPending, startTransition] = useTransition();
  const [logs, setLogs] = useState<string[]>([]);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [retrievedChunks, setRetrievedChunks] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});

  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the terminal logs console
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setFocus(preset.focus);
    setCustomGuidelines(preset.text);
    toast({
      title: "Preset Loaded",
      description: `Loaded guidelines for "${preset.title}"`,
    });
  };

  const handleStartAnalysis = () => {
    setLogs([]);
    setAnalysis(null);
    setRetrievedChunks([]);
    setCompletedTasks({});
    
    // Simulate steps locally in state for visual fidelity
    const stepLogs = [
      "Initializing AI RAG retrieval pipeline...",
      "Binding to local MongoDB instance...",
      "Resolving 'Product', 'Order', and 'User' schema collections...",
      "Analyzing active vector index space...",
    ];

    let timer = 0;
    stepLogs.forEach((log, index) => {
      setTimeout(() => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${log}`]);
        setActiveStep(1);
      }, timer);
      timer += 400;
    });

    setTimeout(() => {
      startTransition(async () => {
        setActiveStep(2);
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Query tokenization active. Searching business document space...`]);
        
        const result = await runAutomatedRAGAnalysis(focus, customGuidelines);
        
        if (result.success && result.analysis) {
          setActiveStep(3);
          // Stream logs from backend action
          result.logs.forEach((bLog, bIdx) => {
            setTimeout(() => {
              setLogs(prev => [...prev, bLog]);
            }, bIdx * 250);
          });

          setTimeout(() => {
            setActiveStep(4);
            setRetrievedChunks(result.retrievedChunks || []);
            setAnalysis(result.analysis);
            setActiveStep(null);
            
            toast({
              title: "RAG Analysis Complete",
              description: "AI synthesized store report successfully compiled.",
            });
          }, (result.logs.length * 250) + 300);
        } else {
          setActiveStep(null);
          const errorLog = result.error || "Generation error. Check console API logs.";
          setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] CRITICAL ERROR: ${errorLog}`]);
          toast({
            variant: "destructive",
            title: "Analysis Failed",
            description: errorLog,
          });
        }
      });
    }, timer);
  };

  const toggleTask = (taskName: string) => {
    setCompletedTasks(prev => ({
      ...prev,
      [taskName]: !prev[taskName]
    }));
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Title block */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 border-slate-200 dark:border-slate-800"
      >
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-500 via-indigo-500 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
            <Brain className="h-8 w-8 text-amber-500 animate-pulse" />
            AI RAG Automated Analyst
          </h2>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Automatically ingest MongoDB store metrics, index custom operational rules, and generate high-fidelity analytical synthesis.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p, i) => (
            <button
              key={i}
              onClick={() => handleApplyPreset(p)}
              className="flex items-center gap-1 bg-white/50 dark:bg-black/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-indigo-500/20 text-xs px-3 py-1.5 rounded-md transition"
            >
              <Bookmark className="mr-1.5 h-3.5 w-3.5 text-indigo-500" />
              {p.title}
            </button>
          ))}
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* RAG Knowledge Store Column */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-t-4 border-t-amber-500 bg-white/40 dark:bg-black/40 backdrop-blur-md shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5 text-amber-500" />
                Knowledge Sources Ingest
              </CardTitle>
              <CardDescription>
                System actively monitors your database collections. Augment it with custom rules below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Connected indicators */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="font-semibold">MongoDB Atlas Store</span>
                  </div>
                  <span>ACTIVE SYNC</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground p-2 rounded-lg bg-slate-100 dark:bg-slate-900 border">
                  <div>🛍️ Product Docs: Ingested</div>
                  <div>💳 Transactions: Ingested</div>
                  <div>👥 Customer Data: Ingested</div>
                  <div>⏳ System Time: UTC-Tracking</div>
                </div>
              </div>

              {/* Focus of analysis */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Analysis Objective Focus</label>
                <input
                  type="text"
                  value={focus}
                  onChange={(e) => setFocus(e.target.value)}
                  placeholder="e.g. Price adjustments or Inventory risks"
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-amber-500 transition"
                />
              </div>

              {/* Paste extra documents */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                  <span>Custom Guidelines / Business Rules</span>
                  <span className="text-[10px] text-indigo-500 font-normal">Chunked & Vector Indexed in-memory</span>
                </label>
                <textarea
                  value={customGuidelines}
                  onChange={(e) => setCustomGuidelines(e.target.value)}
                  rows={9}
                  placeholder="Paste business instructions, competitor stock matching guidelines, or promo targets here..."
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border rounded-md p-3 outline-none focus:ring-1 focus:ring-amber-500 transition font-mono"
                />
              </div>

              <button
                onClick={handleStartAnalysis}
                disabled={isPending || !focus.trim()}
                className="w-full bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-semibold flex items-center justify-center gap-2 py-2 rounded-md shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    RAG Generating...
                  </>
                ) : (
                  <>
                    <Play className="h-4.5 w-4.5 fill-current" />
                    Execute RAG Analysis
                  </>
                )}
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Real-time RAG Pipeline Console Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Flow visualization */}
          <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-md shadow-lg border border-slate-200/50 dark:border-slate-800/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-500" />
                Live RAG Pipeline Execution Flow
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2 relative">
                {/* Visual connectors */}
                <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-gradient-to-r from-amber-500/20 via-indigo-500/20 to-emerald-500/20 -translate-y-1/2 -z-10 hidden md:block" />

                {/* Step 1: Ingestion */}
                <div className={`flex flex-col items-center text-center p-2 rounded-lg border transition ${
                  activeStep === 1 ? "bg-amber-500/10 border-amber-500 animate-pulse shadow-md" : "bg-slate-50/50 dark:bg-slate-900/50 border-transparent"
                }`}>
                  <Database className={`h-6 w-6 mb-2 ${activeStep === 1 ? "text-amber-500" : "text-muted-foreground"}`} />
                  <span className="text-[10px] font-bold">1. Ingest Data</span>
                  <span className="text-[8px] text-muted-foreground hidden sm:inline">MongoDB Collections</span>
                </div>

                {/* Step 2: Indexing */}
                <div className={`flex flex-col items-center text-center p-2 rounded-lg border transition ${
                  activeStep === 2 ? "bg-indigo-500/10 border-indigo-500 animate-pulse shadow-md" : "bg-slate-50/50 dark:bg-slate-900/50 border-transparent"
                }`}>
                  <FileText className={`h-6 w-6 mb-2 ${activeStep === 2 ? "text-indigo-500" : "text-muted-foreground"}`} />
                  <span className="text-[10px] font-bold">2. Chunk & Index</span>
                  <span className="text-[8px] text-muted-foreground hidden sm:inline">Vector TF-IDF Space</span>
                </div>

                {/* Step 3: Retrieval */}
                <div className={`flex flex-col items-center text-center p-2 rounded-lg border transition ${
                  activeStep === 3 ? "bg-violet-500/10 border-violet-500 animate-pulse shadow-md" : "bg-slate-50/50 dark:bg-slate-900/50 border-transparent"
                }`}>
                  <Brain className={`h-6 w-6 mb-2 ${activeStep === 3 ? "text-violet-500" : "text-muted-foreground"}`} />
                  <span className="text-[10px] font-bold">3. Retrieve</span>
                  <span className="text-[8px] text-muted-foreground hidden sm:inline">Top matching chunks</span>
                </div>

                {/* Step 4: Synthesize */}
                <div className={`flex flex-col items-center text-center p-2 rounded-lg border transition ${
                  activeStep === 4 ? "bg-emerald-500/10 border-emerald-500 animate-pulse shadow-md" : "bg-slate-50/50 dark:bg-slate-900/50 border-transparent"
                }`}>
                  <Sparkles className={`h-6 w-6 mb-2 ${activeStep === 4 ? "text-emerald-500" : "text-muted-foreground"}`} />
                  <span className="text-[10px] font-bold">4. Synthesize</span>
                  <span className="text-[8px] text-muted-foreground hidden sm:inline">Gemini Report Out</span>
                </div>
              </div>

              {/* Console log reader */}
              <div className="mt-5 rounded-lg border bg-slate-950 p-4 shadow-inner text-xs font-mono text-emerald-400 h-[180px] overflow-y-auto relative">
                <div className="absolute top-2 right-3 flex items-center gap-1.5 text-[10px] text-slate-500">
                  <Terminal className="h-3 w-3" />
                  RAG CONSOLE ACTIVE
                </div>
                <div className="space-y-1.5">
                  {logs.length === 0 && (
                    <div className="text-slate-500 italic">
                      No active pipeline execution. Adjust guidelines on the left and click "Execute RAG Analysis" to begin compiling intelligence.
                    </div>
                  )}
                  {logs.map((log, i) => (
                    <div key={i} className="leading-relaxed">
                      {log}
                    </div>
                  ))}
                  {isPending && (
                    <div className="flex items-center gap-2 text-indigo-400 mt-2 animate-pulse">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping" />
                      Awaiting response stream from Gemini-2.5-Flash Core...
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
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="space-y-6"
          >
            {/* Context retrieved badge row */}
            {retrievedChunks.length > 0 && (
              <div className="p-4 rounded-lg bg-indigo-500/5 border border-indigo-500/20 backdrop-blur-md">
                <h4 className="text-xs font-bold text-indigo-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                  <Bookmark className="h-3.5 w-3.5 text-indigo-500" />
                  RAG Injected Knowledge Chunks
                </h4>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {retrievedChunks.map((chunk, i) => (
                    <div key={i} className="p-2 text-[10px] bg-slate-900/40 border dark:border-slate-800 rounded text-slate-600 dark:text-slate-300 italic font-mono leading-relaxed">
                      "{chunk.slice(0, 160)}..."
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* KPI Section */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <Card className="border-t-4 border-t-indigo-500 bg-white/40 dark:bg-black/40 backdrop-blur-md shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold">Indexed Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-indigo-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{analysis.kpis.totalRevenue}</div>
                  <p className="text-[10px] text-muted-foreground">Aggregated database sales value</p>
                </CardContent>
              </Card>

              <Card className="border-t-4 border-t-amber-500 bg-white/40 dark:bg-black/40 backdrop-blur-md shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold">Active Orders</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{analysis.kpis.totalOrders}</div>
                  <p className="text-[10px] text-muted-foreground">Completed store orders</p>
                </CardContent>
              </Card>

              <Card className="border-t-4 border-t-violet-500 bg-white/40 dark:bg-black/40 backdrop-blur-md shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold">Average Ticket</CardTitle>
                  <TrendingUp className="h-4 w-4 text-violet-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{analysis.kpis.averageOrderValue}</div>
                  <p className="text-[10px] text-muted-foreground">Synthesized order ticket size</p>
                </CardContent>
              </Card>

              <Card className="border-t-4 border-t-rose-500 bg-white/40 dark:bg-black/40 backdrop-blur-md shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold">Low Stock Risks</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-rose-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{analysis.kpis.lowStockAlerts}</div>
                  <p className="text-[10px] text-muted-foreground">Products below critical buffer</p>
                </CardContent>
              </Card>

              <Card className="border-t-4 border-t-emerald-500 bg-white/40 dark:bg-black/40 backdrop-blur-md shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold">Registered Profiles</CardTitle>
                  <Users className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{analysis.kpis.activeUsers}</div>
                  <p className="text-[10px] text-muted-foreground">Active store profiles</p>
                </CardContent>
              </Card>
            </div>

            {/* Executive Synthesis Summary */}
            <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-md shadow-xl border border-indigo-500/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="h-5 w-5 text-indigo-500" />
                  Executive Synthesis & Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 text-sm leading-relaxed">
                <p className="p-4 rounded-lg bg-indigo-500/5 border border-indigo-500/10 text-slate-800 dark:text-slate-200">
                  {analysis.summary}
                </p>

                {/* Structured Analysis Sections */}
                <div className="grid gap-6 md:grid-cols-2">
                  {analysis.sections.map((section: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-xl border bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                      <h4 className="font-semibold text-indigo-600 dark:text-indigo-400 border-b pb-1.5 flex items-center gap-2">
                        <CheckCircle2 className="h-4.5 w-4.5 text-indigo-500" />
                        {section.title}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {section.content}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* SWOT Matrix & Action checklist */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* SWOT Grid */}
              <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-md shadow-lg">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-indigo-500" />
                    RAG SWOT Strategic Matrix
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  {/* Strengths */}
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block mb-1">STRENGTHS</span>
                    <ul className="text-[11px] space-y-1 list-disc pl-3.5 text-slate-800 dark:text-slate-200 leading-tight">
                      {analysis.swot.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                  {/* Weaknesses */}
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block mb-1">WEAKNESSES</span>
                    <ul className="text-[11px] space-y-1 list-disc pl-3.5 text-slate-800 dark:text-slate-200 leading-tight">
                      {analysis.swot.weaknesses.map((w: string, i: number) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                  {/* Opportunities */}
                  <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block mb-1">OPPORTUNITIES</span>
                    <ul className="text-[11px] space-y-1 list-disc pl-3.5 text-slate-800 dark:text-slate-200 leading-tight">
                      {analysis.swot.opportunities.map((o: string, i: number) => <li key={i}>{o}</li>)}
                    </ul>
                  </div>
                  {/* Threats */}
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 block mb-1">THREATS</span>
                    <ul className="text-[11px] space-y-1 list-disc pl-3.5 text-slate-800 dark:text-slate-200 leading-tight">
                      {analysis.swot.threats.map((t: string, i: number) => <li key={i}>{t}</li>)}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Actionable items checklist */}
              <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-md shadow-lg border border-slate-200/50 dark:border-slate-800/50">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-indigo-500" />
                    Recommended Growth Action Roadmap
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analysis.actionableSteps.map((step: any, idx: number) => {
                    const isCompleted = !!completedTasks[step.task];
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleTask(step.task)}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition ${
                          isCompleted ? "bg-slate-100/50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 opacity-60" : "bg-white/50 dark:bg-black/30 border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        <div className="mt-0.5">
                          {isCompleted ? (
                            <CheckSquare className="h-4.5 w-4.5 text-emerald-500" />
                          ) : (
                            <Square className="h-4.5 w-4.5 text-indigo-500" />
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-semibold ${isCompleted ? "line-through text-muted-foreground" : "text-slate-900 dark:text-slate-100"}`}>
                              {step.task}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                              step.priority === "High" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" :
                              step.priority === "Medium" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                              "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                            }`}>
                              {step.priority}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-tight">
                            {step.reason}
                          </p>
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
  );
}
