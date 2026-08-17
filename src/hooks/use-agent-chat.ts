"use client";

import { useState, useCallback, useRef } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "agent" | "system";
  content: string;
  toolCalls?: Array<{ tool: string; args: any; result: any }>;
  logs?: string[];
  isStreaming?: boolean;
  timestamp: Date;
}

interface UseAgentChatOptions {
  sessionId: string;
  onSend: (
    message: string,
    sessionId: string
  ) => Promise<{
    success: boolean;
    response: string;
    toolCalls?: any[];
    logs?: string[];
    error?: string;
  }>;
}

export function useAgentChat({ sessionId, onSend }: UseAgentChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idCounter = useRef(0);

  const generateId = () => {
    idCounter.current++;
    return `msg-${Date.now()}-${idCounter.current}`;
  };

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      setError(null);

      // Add user message immediately
      const userMsg: ChatMessage = {
        id: generateId(),
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      // Add placeholder for agent response
      const agentMsgId = generateId();
      const placeholderMsg: ChatMessage = {
        id: agentMsgId,
        role: "agent",
        content: "",
        isStreaming: true,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, placeholderMsg]);
      setIsLoading(true);

      try {
        const result = await onSend(content.trim(), sessionId);

        // Update the placeholder with real response
        setMessages((prev) =>
          prev.map((m) =>
            m.id === agentMsgId
              ? {
                  ...m,
                  content: result.response,
                  toolCalls: result.toolCalls,
                  logs: result.logs,
                  isStreaming: false,
                }
              : m
          )
        );

        if (!result.success) {
          setError(result.error || "Agent failed to respond");
        }
      } catch (err: any) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === agentMsgId
              ? {
                  ...m,
                  content: "An error occurred while processing your request.",
                  isStreaming: false,
                }
              : m
          )
        );
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, sessionId, onSend]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const loadHistory = useCallback(
    (history: Array<{ role: string; content: string; createdAt?: string }>) => {
      const loaded: ChatMessage[] = history.map((h, i) => ({
        id: `history-${i}`,
        role: h.role as "user" | "agent",
        content: h.content,
        timestamp: h.createdAt ? new Date(h.createdAt) : new Date(),
      }));
      setMessages(loaded);
    },
    []
  );

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    loadHistory,
  };
}
