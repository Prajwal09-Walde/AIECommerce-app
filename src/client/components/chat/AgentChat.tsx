"use client";

import { useRef, useEffect, useState } from "react";
import { ChatMessage } from "@/hooks/use-agent-chat";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Loader2,
  Bot,
  User,
  Wrench,
  ChevronDown,
  ChevronUp,
  Trash2,
  Sparkles,
} from "lucide-react";

interface AgentChatProps {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  onSend: (message: string) => void;
  onClear: () => void;
  placeholder?: string;
  agentName?: string;
  agentColor?: string;
  suggestions?: string[];
}

export function AgentChat({
  messages,
  isLoading,
  error,
  onSend,
  onClear,
  placeholder = "Ask the AI agent a question...",
  agentName = "Analytics Agent",
  agentColor = "indigo",
  suggestions = [],
}: AgentChatProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput("");
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (!isLoading) {
      onSend(suggestion);
    }
  };

  const colorMap: Record<string, { bg: string; border: string; text: string; accent: string }> = {
    indigo: {
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/30",
      text: "text-indigo-500",
      accent: "from-indigo-500 to-violet-600",
    },
    amber: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      text: "text-amber-500",
      accent: "from-amber-500 to-orange-600",
    },
    emerald: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      text: "text-emerald-500",
      accent: "from-emerald-500 to-teal-600",
    },
    rose: {
      bg: "bg-rose-500/10",
      border: "border-rose-500/30",
      text: "text-rose-500",
      accent: "from-rose-500 to-pink-600",
    },
  };

  const colors = colorMap[agentColor] || colorMap.indigo;

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg bg-gradient-to-br ${colors.accent}`}>
            <Bot className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-sm">{agentName}</span>
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        {messages.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-muted-foreground hover:text-red-500 flex items-center gap-1 transition"
          >
            <Trash2 className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-8">
            <div className={`p-4 rounded-2xl bg-gradient-to-br ${colors.accent} shadow-lg`}>
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{agentName}</h3>
              <p className="text-sm text-muted-foreground max-w-md mt-1">
                Ask me anything about your store data. I can query products, analyze revenue,
                investigate trends, and provide data-driven recommendations.
              </p>
            </div>

            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 max-w-lg justify-center">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(s)}
                    className={`text-xs px-3 py-2 rounded-lg border ${colors.border} ${colors.bg} hover:opacity-80 transition text-left`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {msg.role === "user" ? (
                <UserBubble content={msg.content} />
              ) : (
                <AgentBubble
                  message={msg}
                  colors={colors}
                  agentName={agentName}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-4 mb-2 p-2 text-xs bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400">
          ⚠️ {error}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-slate-200 dark:border-slate-800"
      >
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            disabled={isLoading}
            className="flex-1 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/50 transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={`px-4 py-2.5 rounded-lg bg-gradient-to-r ${colors.accent} text-white font-medium flex items-center gap-2 shadow-lg hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Sub-components ────────────────────────────

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="flex items-start gap-2 max-w-[80%]">
        <div className="bg-indigo-600 text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed shadow-md">
          {content}
        </div>
        <div className="mt-1 p-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex-shrink-0">
          <User className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
        </div>
      </div>
    </div>
  );
}

function AgentBubble({
  message,
  colors,
  agentName,
}: {
  message: ChatMessage;
  colors: any;
  agentName: string;
}) {
  const [showTools, setShowTools] = useState(false);

  return (
    <div className="flex justify-start">
      <div className="flex items-start gap-2 max-w-[85%]">
        <div className={`mt-1 p-1.5 rounded-full ${colors.bg} flex-shrink-0`}>
          <Bot className={`h-3.5 w-3.5 ${colors.text}`} />
        </div>
        <div className="space-y-2">
          <div className={`bg-white dark:bg-slate-900 rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed shadow-md border ${colors.border}`}>
            {message.isStreaming ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">
                  {agentName} is thinking...
                </span>
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <FormattedContent content={message.content} />
              </div>
            )}
          </div>

          {/* Tool calls collapsible */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="ml-1">
              <button
                onClick={() => setShowTools(!showTools)}
                className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-slate-600 dark:hover:text-slate-300 transition"
              >
                <Wrench className="h-3 w-3" />
                {message.toolCalls.length} tool call{message.toolCalls.length > 1 ? "s" : ""} used
                {showTools ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              <AnimatePresence>
                {showTools && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 space-y-1.5 overflow-hidden"
                  >
                    {message.toolCalls.map((tc, i) => (
                      <div
                        key={i}
                        className="text-[10px] font-mono p-2 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                      >
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          🔧 {tc.tool}
                        </span>
                        <span className="text-muted-foreground ml-1">
                          ({JSON.stringify(tc.args).slice(0, 80)}{JSON.stringify(tc.args).length > 80 ? "..." : ""})
                        </span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Simple markdown-like formatter for agent responses
 */
function FormattedContent({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    // Headers
    if (line.startsWith("### ")) {
      elements.push(
        <h4 key={i} className="font-bold text-sm mt-3 mb-1">
          {line.replace("### ", "")}
        </h4>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h3 key={i} className="font-bold text-base mt-3 mb-1">
          {line.replace("## ", "")}
        </h3>
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <h2 key={i} className="font-bold text-lg mt-3 mb-1">
          {line.replace("# ", "")}
        </h2>
      );
    }
    // Bullet points
    else if (line.match(/^[-*•]\s/)) {
      elements.push(
        <div key={i} className="flex items-start gap-2 ml-2">
          <span className="text-indigo-500 mt-0.5">•</span>
          <span>{formatInline(line.replace(/^[-*•]\s/, ""))}</span>
        </div>
      );
    }
    // Numbered list
    else if (line.match(/^\d+\.\s/)) {
      const num = line.match(/^(\d+)\./)?.[1];
      elements.push(
        <div key={i} className="flex items-start gap-2 ml-2">
          <span className="text-indigo-500 font-bold text-xs mt-0.5 min-w-[16px]">{num}.</span>
          <span>{formatInline(line.replace(/^\d+\.\s/, ""))}</span>
        </div>
      );
    }
    // Empty line
    else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    }
    // Regular text
    else {
      elements.push(
        <p key={i} className="leading-relaxed">
          {formatInline(line)}
        </p>
      );
    }
  });

  return <>{elements}</>;
}

/** Format inline bold/code */
function formatInline(text: string): React.ReactNode {
  // Split by **bold** and `code` patterns
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-slate-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono text-indigo-600 dark:text-indigo-400"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
