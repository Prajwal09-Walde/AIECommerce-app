"use server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Create a new business goal delegating to Django Python agent.
 */
export async function createGoal(description: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/agent/goals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to create goal: ${res.statusText}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("Create goal error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Run store manager planning cycle delegating to Django Python agent.
 */
export async function runManagerCycle(goalId: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/agent/goals/cycle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalId }),
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to run manager planning cycle: ${res.statusText}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("Run manager cycle error:", error);
    return {
      success: false,
      logs: [`[${new Date().toLocaleTimeString()}] ❌ ERROR: ${error.message}`],
      error: error.message,
    };
  }
}

/**
 * Approve a specific action in a goal plan delegating to Django Python agent.
 */
export async function approveAction(goalId: string, actionId: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/agent/goals/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalId, actionId, decision: "approve" }),
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to approve action: ${res.statusText}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("Approve action error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Reject a specific action in a goal plan delegating to Django Python agent.
 */
export async function rejectAction(goalId: string, actionId: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/agent/goals/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalId, actionId, decision: "reject" }),
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to reject action: ${res.statusText}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("Reject action error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Execute all approved actions delegating to Django Python agent.
 */
export async function executeApprovedActions(goalId: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/agent/goals/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalId }),
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to execute approved actions: ${res.statusText}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("Execute approved actions error:", error);
    return {
      success: false,
      executed: 0,
      failed: 0,
      logs: [`[${new Date().toLocaleTimeString()}] ❌ ERROR: ${error.message}`],
      error: error.message,
    };
  }
}

/**
 * Get all goals delegating to Django Python agent.
 */
export async function getGoals() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/agent/goals`, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch goals: ${res.statusText}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("Get goals error:", error);
    return [];
  }
}

/**
 * Update a goal's status delegating to Django Python agent.
 */
export async function updateGoalStatus(
  goalId: string,
  status: "active" | "paused" | "completed" | "failed"
) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/agent/goals/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalId, status }),
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to update goal status: ${res.statusText}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("Update goal status error:", error);
    return { success: false, error: error.message };
  }
}
