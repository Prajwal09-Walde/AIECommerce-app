"use client";

import { useState, useTransition } from "react";
import {
  runPricingAnalysis,
  applyPriceChange,
  applyAllPriceChanges,
} from "@/actions/pricing-agent-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Check,
  CheckCheck,
  Bot,
  ArrowRight,
  Sparkles,
  BarChart3,
  Package,
  Zap,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface Recommendation {
  productId: string;
  productName: string;
  category: string;
  currentPrice: number;
  recommendedPrice: number;
  changePercent: number;
  confidence: "high" | "medium" | "low";
  reason: string;
  salesVelocity: number;
  stockDaysRemaining: number;
}

const CONFIDENCE_COLORS = {
  high: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20" },
  medium: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20" },
  low: { bg: "bg-slate-500/10", text: "text-slate-600 dark:text-slate-400", border: "border-slate-500/20" },
};

export default function PricingPage() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [logs, setLogs] = useState<string[]>([]);
  const [hasRun, setHasRun] = useState(false);

  const handleRunAnalysis = () => {
    setRecommendations([]);
    setAppliedIds(new Set());
    setLogs([]);

    startTransition(async () => {
      const result = await runPricingAnalysis();
      if (result.success) {
        setRecommendations(result.recommendations);
        setLogs(result.logs);
        setHasRun(true);
        toast({
          title: "Pricing Analysis Complete",
          description: `${result.recommendations.length} product recommendations generated.`,
        });
      } else {
        setLogs(result.logs);
        toast({
          variant: "destructive",
          title: "Analysis Failed",
          description: result.error || "Unknown error",
        });
      }
    });
  };

  const handleApplySingle = async (rec: Recommendation) => {
    const result = await applyPriceChange(
      rec.productId,
      rec.recommendedPrice,
      rec.reason
    );
    if (result.success) {
      setAppliedIds((prev) => {
        const next = new Set(Array.from(prev));
        next.add(rec.productId);
        return next;
      });
      toast({
        title: "Price Updated",
        description: `${result.productName}: $${result.oldPrice} → $${result.newPrice}`,
      });
    }
  };

  const handleApplyAll = async () => {
    const unapplied = recommendations.filter(
      (r) => !appliedIds.has(r.productId) && r.changePercent !== 0
    );
    if (unapplied.length === 0) return;

    const result = await applyAllPriceChanges(
      unapplied.map((r) => ({
        productId: r.productId,
        newPrice: r.recommendedPrice,
        reason: r.reason,
      }))
    );

    if (result.success) {
      setAppliedIds((prev) => {
        const next = new Set(Array.from(prev));
        unapplied.forEach((r) => next.add(r.productId));
        return next;
      });
      toast({
        title: "Bulk Price Update",
        description: `${result.applied} prices updated, ${result.failed} failed.`,
      });
    }
  };

  // Summary stats
  const priceIncreases = recommendations.filter((r) => r.changePercent > 0);
  const priceDecreases = recommendations.filter((r) => r.changePercent < 0);
  const noChange = recommendations.filter((r) => r.changePercent === 0);
  const avgChange =
    recommendations.length > 0
      ? recommendations.reduce((s, r) => s + r.changePercent, 0) / recommendations.length
      : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 border-slate-200 dark:border-slate-800"
      >
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-emerald-500" />
            <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500 bg-clip-text text-transparent">
              AI Dynamic Pricing
            </span>
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            AI analyzes sales velocity, stock levels, and demand to recommend optimal prices.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {recommendations.length > 0 && (
            <button
              onClick={handleApplyAll}
              disabled={appliedIds.size === recommendations.filter((r) => r.changePercent !== 0).length}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-medium rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition disabled:opacity-50"
            >
              <CheckCheck className="h-4 w-4" />
              Apply All Changes
            </button>
          )}
          <button
            onClick={handleRunAnalysis}
            disabled={isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Bot className="h-4 w-4" />
                Run Pricing Analysis
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Summary cards */}
      {hasRun && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 md:grid-cols-4"
        >
          <Card className="border-t-4 border-t-emerald-500 bg-white/40 dark:bg-black/40 backdrop-blur-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Price Increases</p>
                <p className="text-2xl font-bold text-emerald-600">{priceIncreases.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-500 opacity-50" />
            </CardContent>
          </Card>
          <Card className="border-t-4 border-t-red-500 bg-white/40 dark:bg-black/40 backdrop-blur-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Price Decreases</p>
                <p className="text-2xl font-bold text-red-600">{priceDecreases.length}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500 opacity-50" />
            </CardContent>
          </Card>
          <Card className="border-t-4 border-t-slate-400 bg-white/40 dark:bg-black/40 backdrop-blur-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">No Change</p>
                <p className="text-2xl font-bold">{noChange.length}</p>
              </div>
              <Minus className="h-8 w-8 text-slate-400 opacity-50" />
            </CardContent>
          </Card>
          <Card className="border-t-4 border-t-indigo-500 bg-white/40 dark:bg-black/40 backdrop-blur-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Avg. Change</p>
                <p className={`text-2xl font-bold ${avgChange >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {avgChange >= 0 ? "+" : ""}{avgChange.toFixed(1)}%
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-indigo-500 opacity-50" />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Empty state */}
      {!hasRun && !isPending && (
        <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-md shadow-xl border border-emerald-500/10">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg mb-6">
              <Sparkles className="h-12 w-12 text-white" />
            </div>
            <h3 className="font-bold text-xl mb-2">AI Dynamic Pricing Engine</h3>
            <p className="text-sm text-muted-foreground max-w-lg mb-6">
              Analyzes your product catalog's sales velocity, stock-to-demand ratios, and margin potential
              to generate intelligent pricing recommendations with per-product reasoning.
            </p>
            <div className="grid grid-cols-3 gap-4 max-w-lg mb-8">
              <div className="flex flex-col items-center text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                <Zap className="h-5 w-5 text-amber-500 mb-1" />
                <span className="text-[10px] font-medium">Sales Velocity</span>
              </div>
              <div className="flex flex-col items-center text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                <Package className="h-5 w-5 text-indigo-500 mb-1" />
                <span className="text-[10px] font-medium">Stock Analysis</span>
              </div>
              <div className="flex flex-col items-center text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                <ShieldCheck className="h-5 w-5 text-emerald-500 mb-1" />
                <span className="text-[10px] font-medium">Margin Guard</span>
              </div>
            </div>
            <button
              onClick={handleRunAnalysis}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition text-sm"
            >
              <Bot className="h-5 w-5" />
              Run First Analysis
            </button>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isPending && (
        <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-md">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mb-4" />
            <p className="font-semibold">Analyzing pricing across all products...</p>
            <p className="text-xs text-muted-foreground mt-1">
              Computing sales velocity, stock ratios, and generating AI recommendations
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recommendations table */}
      {hasRun && recommendations.length > 0 && !isPending && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-md shadow-xl overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bot className="h-5 w-5 text-emerald-500" />
                Pricing Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50/50 dark:bg-slate-900/50">
                      <th className="text-left p-3 font-medium text-xs text-muted-foreground">Product</th>
                      <th className="text-left p-3 font-medium text-xs text-muted-foreground">Category</th>
                      <th className="text-right p-3 font-medium text-xs text-muted-foreground">Current</th>
                      <th className="text-center p-3 font-medium text-xs text-muted-foreground"></th>
                      <th className="text-right p-3 font-medium text-xs text-muted-foreground">Recommended</th>
                      <th className="text-right p-3 font-medium text-xs text-muted-foreground">Change</th>
                      <th className="text-center p-3 font-medium text-xs text-muted-foreground">Confidence</th>
                      <th className="text-right p-3 font-medium text-xs text-muted-foreground">Velocity</th>
                      <th className="text-right p-3 font-medium text-xs text-muted-foreground">Stock Days</th>
                      <th className="text-center p-3 font-medium text-xs text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {recommendations.map((rec, idx) => {
                        const isApplied = appliedIds.has(rec.productId);
                        const confColors = CONFIDENCE_COLORS[rec.confidence];

                        return (
                          <motion.tr
                            key={rec.productId}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className={`border-b last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition ${
                              isApplied ? "opacity-50" : ""
                            }`}
                          >
                            <td className="p-3 font-medium max-w-[200px]">
                              <div className="truncate">{rec.productName}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{rec.reason}</div>
                            </td>
                            <td className="p-3">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                                {rec.category}
                              </span>
                            </td>
                            <td className="p-3 text-right font-mono font-medium">
                              ${rec.currentPrice.toFixed(2)}
                            </td>
                            <td className="p-3 text-center">
                              <ArrowRight className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
                            </td>
                            <td className="p-3 text-right font-mono font-bold">
                              ${rec.recommendedPrice.toFixed(2)}
                            </td>
                            <td className="p-3 text-right">
                              {rec.changePercent === 0 ? (
                                <span className="text-xs text-muted-foreground">—</span>
                              ) : (
                                <span
                                  className={`text-xs font-bold ${
                                    rec.changePercent > 0
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-red-600 dark:text-red-400"
                                  }`}
                                >
                                  {rec.changePercent > 0 ? "+" : ""}
                                  {rec.changePercent.toFixed(1)}%
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${confColors.bg} ${confColors.text} ${confColors.border} border`}
                              >
                                {rec.confidence}
                              </span>
                            </td>
                            <td className="p-3 text-right font-mono text-xs">
                              {rec.salesVelocity.toFixed(1)}/day
                            </td>
                            <td className="p-3 text-right font-mono text-xs">
                              <span
                                className={
                                  rec.stockDaysRemaining < 7
                                    ? "text-red-500 font-bold"
                                    : rec.stockDaysRemaining < 30
                                    ? "text-amber-500"
                                    : "text-muted-foreground"
                                }
                              >
                                {rec.stockDaysRemaining >= 999 ? "∞" : `${rec.stockDaysRemaining}d`}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {isApplied ? (
                                <span className="text-emerald-500 flex items-center justify-center gap-1 text-xs">
                                  <Check className="h-3.5 w-3.5" />
                                  Applied
                                </span>
                              ) : rec.changePercent === 0 ? (
                                <span className="text-xs text-muted-foreground">N/A</span>
                              ) : (
                                <button
                                  onClick={() => handleApplySingle(rec)}
                                  className="text-xs px-3 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition font-medium"
                                >
                                  Apply
                                </button>
                              )}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
