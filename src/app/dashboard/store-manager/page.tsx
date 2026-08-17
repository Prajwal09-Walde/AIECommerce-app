"use client";

import { useState, useEffect, useTransition } from "react";
import {
  createGoal,
  getGoals,
  runManagerCycle,
  approveAction,
  rejectAction,
  executeApprovedActions,
  updateGoalStatus,
} from "@/actions/store-manager-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Brain,
  Target,
  CheckCircle2,
  XCircle,
  Play,
  Pause,
  Plus,
  Loader2,
  ChevronRight,
  ChevronDown,
  Activity,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  AlertCircle,
  Clock,
  Check,
  X,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export default function StoreManagerPage() {
  const { toast } = useToast();
  const [goals, setGoals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  
  // New Goal Form
  const [isCreating, setIsCreating] = useState(false);
  const [newGoalDesc, setNewGoalDesc] = useState("");

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const data = await getGoals();
      setGoals(data);
      if (data.length > 0 && !expandedGoalId) {
        setExpandedGoalId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load goals:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGoal = () => {
    if (!newGoalDesc.trim()) return;

    startTransition(async () => {
      const result = await createGoal(newGoalDesc);
      if (result.success) {
        toast({ title: "Goal Created", description: "Store Manager is ready to plan." });
        setNewGoalDesc("");
        setIsCreating(false);
        await loadGoals();
        setExpandedGoalId(result.goalId);
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
      }
    });
  };

  const handleRunPlanningCycle = (goalId: string) => {
    startTransition(async () => {
      const result = await runManagerCycle(goalId);
      if (result.success) {
        toast({
          title: "Planning Cycle Complete",
          description: `Agent proposed ${result.actionsCreated} new action(s).`,
        });
        await loadGoals();
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
      }
    });
  };

  const handleActionDecision = async (goalId: string, actionId: string, approve: boolean) => {
    const fn = approve ? approveAction : rejectAction;
    const result = await fn(goalId, actionId);
    if (result.success) {
      // Optimistic update
      setGoals((prev) =>
        prev.map((g) => {
          if (g.id !== goalId) return g;
          return {
            ...g,
            actions: g.actions.map((a: any) =>
              a.id === actionId ? { ...a, status: approve ? "approved" : "rejected" } : a
            ),
          };
        })
      );
    }
  };

  const handleExecuteActions = (goalId: string) => {
    startTransition(async () => {
      const result = await executeApprovedActions(goalId);
      if (result.success) {
        toast({
          title: "Execution Complete",
          description: `Successfully executed ${result.executed} action(s).`,
        });
        await loadGoals();
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
      }
    });
  };

  const handleToggleStatus = (goalId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    startTransition(async () => {
      const result = await updateGoalStatus(goalId, newStatus);
      if (result.success) {
        await loadGoals();
      }
    });
  };

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
            <Brain className="h-8 w-8 text-violet-500" />
            <span className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 bg-clip-text text-transparent">
              Autonomous Store Manager
            </span>
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Set business goals. Let the AI agent analyze, plan, and execute (with your approval).
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition"
        >
          <Plus className="h-4 w-4" />
          Set New Goal
        </button>
      </motion.div>

      {/* Create Goal Form */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-md border-violet-500/30 mb-6">
              <CardContent className="p-4 sm:p-6">
                <h3 className="font-semibold mb-2">Set a Business Goal</h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newGoalDesc}
                    onChange={(e) => setNewGoalDesc(e.target.value)}
                    placeholder="e.g. Clear out excess inventory for electronics while maintaining 20% margin"
                    className="flex-1 text-sm bg-slate-50 dark:bg-slate-950 border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                  <button
                    onClick={handleCreateGoal}
                    disabled={isPending || !newGoalDesc.trim()}
                    className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition disabled:opacity-50"
                  >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Initialize Agent"}
                  </button>
                  <button
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-2.5 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-xs text-muted-foreground mt-1 mr-2">Quick presets:</span>
                  {[
                    "Maximize Q3 revenue through dynamic pricing",
                    "Clear old inventory before new season",
                    "Increase average order value by 15%",
                  ].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setNewGoalDesc(preset)}
                      className="text-[10px] px-2 py-1 rounded-full border bg-slate-50 dark:bg-slate-900 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goal List */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      ) : goals.length === 0 ? (
        <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-md">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-4 rounded-full bg-violet-500/10 mb-4">
              <Target className="h-12 w-12 text-violet-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">No Goals Set</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              The Autonomous Store Manager needs a goal to work towards. Set an objective, and it will analyze your store and propose a strategic action plan.
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="px-6 py-3 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition"
            >
              Set Your First Goal
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {goals.map((goal) => {
            const isExpanded = expandedGoalId === goal.id;
            const pendingActions = goal.actions.filter((a: any) => a.status === "proposed");
            const approvedActions = goal.actions.filter((a: any) => a.status === "approved");

            return (
              <Card
                key={goal.id}
                className={`overflow-hidden transition-all ${
                  isExpanded ? "ring-2 ring-violet-500/50 shadow-lg" : "hover:shadow-md"
                } bg-white/60 dark:bg-black/40 backdrop-blur-md`}
              >
                {/* Goal Header */}
                <div
                  className="p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                  onClick={() => setExpandedGoalId(isExpanded ? null : goal.id)}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-2.5 rounded-lg shrink-0 mt-0.5 ${
                        goal.status === "active"
                          ? "bg-violet-500/20 text-violet-600 dark:text-violet-400"
                          : "bg-slate-500/20 text-slate-500"
                      }`}
                    >
                      <Target className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg">{goal.description}</h3>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            goal.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-slate-500/10 text-slate-500"
                          }`}
                        >
                          {goal.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Activity className="h-3.5 w-3.5" />
                          {goal.actions.length} total actions
                        </span>
                        {pendingActions.length > 0 && (
                          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {pendingActions.length} awaiting approval
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          Updated {new Date(goal.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-200 dark:border-slate-800"
                    >
                      <div className="p-5 space-y-8">
                        
                        {/* Control Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border">
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRunPlanningCycle(goal.id);
                              }}
                              disabled={isPending || goal.status !== "active"}
                              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition disabled:opacity-50"
                            >
                              {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Brain className="h-4 w-4" />
                              )}
                              Agent Planning Cycle
                            </button>

                            {approvedActions.length > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExecuteActions(goal.id);
                                }}
                                disabled={isPending}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 animate-pulse"
                              >
                                <Zap className="h-4 w-4" />
                                Execute {approvedActions.length} Action(s)
                              </button>
                            )}
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(goal.id, goal.status);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-950 border text-sm font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition"
                          >
                            {goal.status === "active" ? (
                              <>
                                <Pause className="h-4 w-4" /> Pause Agent
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4" /> Resume Agent
                              </>
                            )}
                          </button>
                        </div>

                        {/* Progress Metrics */}
                        {goal.progressMetrics && goal.progressMetrics.length > 0 && (
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-violet-500" />
                              KPI Tracking
                            </h4>
                            <div className="grid grid-cols-3 gap-4">
                              {goal.progressMetrics.map((metric: any, i: number) => {
                                const icons = {
                                  totalRevenue: DollarSign,
                                  totalOrders: ShoppingCart,
                                  averageOrderValue: Activity,
                                };
                                const Icon = icons[metric.metric as keyof typeof icons] || Activity;
                                const isCurrency = ["totalRevenue", "averageOrderValue"].includes(metric.metric);
                                
                                const current = isCurrency ? `$${metric.current.toFixed(2)}` : metric.current;
                                const target = isCurrency ? `$${metric.target.toFixed(2)}` : metric.target;
                                
                                // Progress bar calc
                                const range = Math.abs(metric.target - metric.baseline);
                                const progress = range === 0 ? 0 : Math.min(100, Math.max(0, ((metric.current - metric.baseline) / range) * 100));

                                return (
                                  <div key={i} className="p-3 rounded-lg border bg-white dark:bg-slate-950">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                        <Icon className="h-3 w-3" />
                                        {metric.metric.replace(/([A-Z])/g, ' $1').trim()}
                                      </span>
                                    </div>
                                    <div className="flex items-baseline gap-2 mb-2">
                                      <span className="text-lg font-bold">{current}</span>
                                      <span className="text-[10px] text-muted-foreground">Target: {target}</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                      <div 
                                        className="bg-violet-500 h-full rounded-full transition-all duration-1000"
                                        style={{ width: `${progress}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Agent Notes */}
                        {goal.agentNotes && (
                          <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/20">
                            <h4 className="text-xs font-bold text-violet-600 dark:text-violet-400 mb-1 flex items-center gap-1.5">
                              <Brain className="h-3.5 w-3.5" />
                              Agent Strategy Notes
                            </h4>
                            <p className="text-sm text-slate-700 dark:text-slate-300">
                              {goal.agentNotes}
                            </p>
                          </div>
                        )}

                        {/* Actions List */}
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                            <Target className="h-4 w-4 text-violet-500" />
                            Action Plan
                          </h4>
                          
                          {goal.actions.length === 0 ? (
                            <div className="text-center py-6 border border-dashed rounded-lg text-sm text-muted-foreground">
                              No actions planned yet. Click "Agent Planning Cycle" to generate a plan.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {goal.actions.map((action: any) => (
                                <div
                                  key={action.id}
                                  className={`p-4 rounded-lg border flex flex-col sm:flex-row sm:items-start justify-between gap-4 transition ${
                                    action.status === "proposed" ? "bg-amber-500/5 border-amber-500/30" :
                                    action.status === "approved" ? "bg-emerald-500/5 border-emerald-500/30 ring-1 ring-emerald-500/50" :
                                    action.status === "executed" ? "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-70" :
                                    action.status === "rejected" ? "bg-red-500/5 border-red-500/20 opacity-50" :
                                    "bg-white dark:bg-slate-950"
                                  }`}
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-semibold text-sm">{action.description}</span>
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                        action.status === "proposed" ? "bg-amber-500/20 text-amber-600" :
                                        action.status === "approved" ? "bg-emerald-500/20 text-emerald-600" :
                                        action.status === "executed" ? "bg-slate-500/20 text-slate-500" :
                                        action.status === "rejected" ? "bg-red-500/20 text-red-600" :
                                        "bg-slate-100 text-slate-500"
                                      }`}>
                                        {action.status}
                                      </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground font-mono mt-2 space-y-1">
                                      <div>Type: <span className="text-violet-500 font-bold">{action.type}</span></div>
                                      {action.params && Object.entries(action.params).map(([k, v]) => (
                                        <div key={k}>{k}: {String(v)}</div>
                                      ))}
                                      {action.result && (
                                        <div className="mt-2 pt-2 border-t text-emerald-600 dark:text-emerald-400">
                                          Result: {JSON.stringify(action.result)}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Action Controls */}
                                  {action.status === "proposed" && (
                                    <div className="flex gap-2 shrink-0">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleActionDecision(goal.id, action.id, true);
                                        }}
                                        className="p-2 rounded-md bg-emerald-500 text-white hover:bg-emerald-600 transition"
                                        title="Approve Action"
                                      >
                                        <Check className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleActionDecision(goal.id, action.id, false);
                                        }}
                                        className="p-2 rounded-md bg-slate-200 dark:bg-slate-800 hover:bg-red-500 hover:text-white transition"
                                        title="Reject Action"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                  )}
                                  
                                  {action.status === "approved" && (
                                    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-500 text-xs font-medium">
                                      <CheckCircle2 className="h-4 w-4" />
                                      Ready to execute
                                    </div>
                                  )}
                                  
                                  {action.status === "executed" && (
                                    <div className="flex items-center gap-1 text-slate-500 text-xs font-medium">
                                      <CheckCircle2 className="h-4 w-4" />
                                      Executed
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
