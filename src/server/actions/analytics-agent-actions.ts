"use server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Runs a single turn of the ReAct analytics agent delegating to the Django Python agent.
 */
export async function runAnalyticsAgent(
  userMessage: string,
  sessionId: string
) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/agent/analytics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage, sessionId }),
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to run analytics agent: ${res.statusText}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("Analytics agent error:", error);
    return {
      success: false,
      response: "An error occurred while communicating with the Python AI Agent.",
      toolCalls: [],
      logs: [`[${new Date().toLocaleTimeString()}] ❌ ERROR: ${error.message}`],
      error: error.message,
    };
  }
}

/**
 * Get conversation history for a session from the Django database
 */
export async function getAgentHistory(sessionId: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/agent/analytics/history?sessionId=${sessionId}`, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch history: ${res.statusText}`);
    }

    return await res.json();
  } catch (error) {
    console.error("Failed to fetch agent history:", error);
    return [];
  }
}

/**
 * Clear conversation history for a session in the Django database
 */
export async function clearAgentHistory(sessionId: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/agent/analytics/clear`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to clear history: ${res.statusText}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("Failed to clear agent history:", error);
    return { success: false, error: error.message };
  }
}
