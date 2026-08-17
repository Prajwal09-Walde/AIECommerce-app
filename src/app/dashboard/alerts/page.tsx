"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import {
  getAlerts,
  acknowledgeAlert,
  dismissAlert,
  acknowledgeAllAlerts,
} from "@/actions/alert-agent-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Bell,
  BellOff,
  Loader2,
  RefreshCw,
  Search,
  CheckCheck,
  X,
  Zap,
  Package,
  DollarSign,
  Settings,
  Target,
  Bot,
  Sparkles,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface AlertItem {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  source: string;
  metadata: any;
  acknowledged: boolean;
  createdAt: string;
}

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertCircle,
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-900",
    iconColor: "text-red-500",
    badge: "bg-red-500/10 text-red-600 dark:text-red-400",
    pulse: "bg-red-500",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-900",
    iconColor: "text-amber-500",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    pulse: "bg-amber-500",
  },
  info: {
    icon: Info,
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-900",
    iconColor: "text-blue-500",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    pulse: "bg-blue-500",
  },
};

const TYPE_CONFIG: Record<string, { icon: any; label: string }> = {
  anomaly: { icon: Zap, label: "Anomaly" },
  low_stock: { icon: Package, label: "Stock" },
  pricing: { icon: DollarSign, label: "Pricing" },
  system: { icon: Settings, label: "System" },
  goal: { icon: Target, label: "Goal" },
};

export default function AlertsPage() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [totalUnacknowledged, setTotalUnacknowledged] = useState(0);
  const [isScanning, startScanTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "critical" | "warning" | "info">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    try {
      const result = await getAlerts({ limit: 100 });
      setAlerts(result.alerts);
      setTotalUnacknowledged(result.totalUnacknowledged);
    } catch (err) {
      console.error("Failed to load alerts:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleRunScan = () => {
    startScanTransition(async () => {
      try {
        const response = await fetch("/api/alert-scan", { method: "POST" });
        const result = await response.json();

        if (result.success) {
          setLastScanTime(new Date().toLocaleTimeString());
          toast({
            title: "AI Scan Complete",
            description: `${result.newAlertCount} new alert(s) generated.`,
          });
          await loadAlerts();
        } else {
          toast({
            variant: "destructive",
            title: "Scan Failed",
            description: result.error || "Unknown error",
          });
        }
      } catch (err: any) {
        toast({
          variant: "destructive",
          title: "Scan Error",
          description: err.message,
        });
      }
    });
  };

  const handleAcknowledge = async (id: string) => {
    await acknowledgeAlert(id);
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
    );
    setTotalUnacknowledged((prev) => Math.max(0, prev - 1));
  };

  const handleDismiss = async (id: string) => {
    await dismissAlert(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    toast({ title: "Alert dismissed" });
  };

  const handleAcknowledgeAll = async () => {
    await acknowledgeAllAlerts();
    setAlerts((prev) => prev.map((a) => ({ ...a, acknowledged: true })));
    setTotalUnacknowledged(0);
    toast({ title: "All alerts acknowledged" });
  };

  // Filter alerts
  const filteredAlerts = alerts.filter((a) => {
    if (filter === "unread" && a.acknowledged) return false;
    if (filter === "critical" && a.severity !== "critical") return false;
    if (filter === "warning" && a.severity !== "warning") return false;
    if (filter === "info" && a.severity !== "info") return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const severityCounts = {
    critical: alerts.filter((a) => a.severity === "critical" && !a.acknowledged).length,
    warning: alerts.filter((a) => a.severity === "warning" && !a.acknowledged).length,
    info: alerts.filter((a) => a.severity === "info" && !a.acknowledged).length,
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="relative">
              <Bell className="h-8 w-8 text-red-500" />
              {totalUnacknowledged > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {totalUnacknowledged}
                </span>
              )}
            </div>
            <span className="bg-gradient-to-r from-red-500 via-amber-500 to-indigo-500 bg-clip-text text-transparent">
              AI Alert Center
            </span>
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            AI-powered monitoring detects anomalies, stock issues, and pricing opportunities.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastScanTime && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last scan: {lastScanTime}
            </span>
          )}
          <button
            onClick={handleRunScan}
            disabled={isScanning}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-amber-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition disabled:opacity-50"
          >
            {isScanning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Bot className="h-4 w-4" />
                Run AI Scan
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card
          className={`cursor-pointer transition hover:shadow-md ${
            filter === "all" ? "ring-2 ring-indigo-500" : ""
          }`}
          onClick={() => setFilter("all")}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Alerts</p>
              <p className="text-2xl font-bold">{alerts.length}</p>
            </div>
            <Bell className="h-8 w-8 text-indigo-500 opacity-50" />
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition hover:shadow-md ${
            filter === "critical" ? "ring-2 ring-red-500" : ""
          }`}
          onClick={() => setFilter("critical")}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Critical</p>
              <p className="text-2xl font-bold text-red-500">{severityCounts.critical}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-500 opacity-50" />
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition hover:shadow-md ${
            filter === "warning" ? "ring-2 ring-amber-500" : ""
          }`}
          onClick={() => setFilter("warning")}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Warnings</p>
              <p className="text-2xl font-bold text-amber-500">{severityCounts.warning}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-amber-500 opacity-50" />
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition hover:shadow-md ${
            filter === "info" ? "ring-2 ring-blue-500" : ""
          }`}
          onClick={() => setFilter("info")}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Info</p>
              <p className="text-2xl font-bold text-blue-500">{severityCounts.info}</p>
            </div>
            <Info className="h-8 w-8 text-blue-500 opacity-50" />
          </CardContent>
        </Card>
      </div>

      {/* Controls bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search alerts..."
              className="pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-950 border rounded-lg w-64 outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
          <button
            onClick={() => setFilter(filter === "unread" ? "all" : "unread")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition ${
              filter === "unread"
                ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400"
                : "bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900"
            }`}
          >
            {filter === "unread" ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
            Unread Only
          </button>
        </div>

        <div className="flex items-center gap-2">
          {totalUnacknowledged > 0 && (
            <button
              onClick={handleAcknowledgeAll}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-900 transition"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Acknowledge All
            </button>
          )}
          <button
            onClick={loadAlerts}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-900 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Alert List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredAlerts.length === 0 ? (
        <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-md">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-2xl bg-emerald-500/10 mb-4">
              <Sparkles className="h-10 w-10 text-emerald-500" />
            </div>
            <h3 className="font-semibold text-lg">All Clear!</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              {alerts.length === 0
                ? 'No alerts yet. Click "Run AI Scan" to analyze your store for issues.'
                : "No alerts match your current filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredAlerts.map((alert, idx) => {
              const severity = SEVERITY_CONFIG[alert.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.info;
              const typeConfig = TYPE_CONFIG[alert.type] || TYPE_CONFIG.system;
              const TypeIcon = typeConfig.icon;
              const SeverityIcon = severity.icon;
              const isExpanded = expandedId === alert.id;
              const timeAgo = getTimeAgo(alert.createdAt);

              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card
                    className={`${severity.bg} ${severity.border} border transition-all hover:shadow-md cursor-pointer ${
                      alert.acknowledged ? "opacity-60" : ""
                    }`}
                    onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Severity icon */}
                        <div className="relative mt-0.5">
                          <SeverityIcon className={`h-5 w-5 ${severity.iconColor}`} />
                          {!alert.acknowledged && (
                            <span className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ${severity.pulse} animate-ping`} />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${severity.badge}`}>
                              {alert.severity.toUpperCase()}
                            </span>
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 flex items-center gap-1">
                              <TypeIcon className="h-2.5 w-2.5" />
                              {typeConfig.label}
                            </span>
                          </div>

                          <h4 className="font-semibold text-sm">{alert.title}</h4>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                              >
                                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                                  {alert.description}
                                </p>
                                <div className="flex items-center gap-2 mt-3">
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Bot className="h-3 w-3" />
                                    Source: {alert.source}
                                  </span>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Actions & time */}
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {timeAgo}
                          </span>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {!alert.acknowledged && (
                              <button
                                onClick={() => handleAcknowledge(alert.id)}
                                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                                title="Acknowledge"
                              >
                                <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDismiss(alert.id)}
                              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                              title="Dismiss"
                            >
                              <X className="h-3.5 w-3.5 text-red-500" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDay}d ago`;
}
