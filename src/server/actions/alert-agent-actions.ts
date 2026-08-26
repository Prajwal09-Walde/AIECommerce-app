"use server";

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/['"]/g, "");

/**
 * Runs a full AI-powered store health scan delegating to Django Python agent.
 */
export async function runAlertScan() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/agent/alerts/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to run alert scan: ${res.statusText}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("Alert scan error:", error);
    return {
      success: false,
      newAlertCount: 0,
      logs: [`[${new Date().toLocaleTimeString()}] ❌ ERROR: ${error.message}`],
      error: error.message,
    };
  }
}

/**
 * Fetch alerts delegating to Django Python agent.
 */
export async function getAlerts(filters?: {
  type?: string;
  severity?: string;
  acknowledged?: boolean;
  limit?: number;
}) {
  try {
    const url = new URL(`${BACKEND_URL}/api/agent/alerts`);
    if (filters?.type) url.searchParams.append("type", filters.type);
    if (filters?.severity) url.searchParams.append("severity", filters.severity);
    if (filters?.acknowledged !== undefined) {
      url.searchParams.append("acknowledged", filters.acknowledged.toString());
    }
    if (filters?.limit) url.searchParams.append("limit", filters.limit.toString());

    const res = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to load alerts: ${res.statusText}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("Get alerts error:", error);
    return { alerts: [], totalUnacknowledged: 0 };
  }
}

/**
 * Acknowledge an alert delegating to Django Python agent.
 */
export async function acknowledgeAlert(alertId: string) {
  try {
    // Alert ID in python SQLite is a number (integer)
    const intId = parseInt(alertId, 10);
    const res = await fetch(`${BACKEND_URL}/api/agent/alerts/${isNaN(intId) ? alertId : intId}/acknowledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to acknowledge alert: ${res.statusText}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("Acknowledge alert error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Dismiss (delete) an alert delegating to Django Python agent.
 */
export async function dismissAlert(alertId: string) {
  try {
    const intId = parseInt(alertId, 10);
    const res = await fetch(`${BACKEND_URL}/api/agent/alerts/${isNaN(intId) ? alertId : intId}/dismiss`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to dismiss alert: ${res.statusText}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("Dismiss alert error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Acknowledge all alerts delegating to Django Python agent.
 */
export async function acknowledgeAllAlerts() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/agent/alerts/acknowledge-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to acknowledge all alerts: ${res.statusText}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("Acknowledge all alerts error:", error);
    return { success: false, error: error.message };
  }
}
