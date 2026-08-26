"use server";

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/['"]/g, "");

interface PricingRecommendation {
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

/**
 * Run pricing analysis delegating to Django Python agent.
 */
export async function runPricingAnalysis() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/agent/pricing/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to run pricing analysis: ${res.statusText}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("Pricing analysis error:", error);
    return {
      success: false,
      recommendations: [],
      logs: [`[${new Date().toLocaleTimeString()}] ❌ ERROR: ${error.message}`],
      error: error.message,
    };
  }
}

/**
 * Apply a single price change delegating to Django Python agent.
 */
export async function applyPriceChange(
  productId: string,
  newPrice: number,
  reason: string
) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/agent/pricing/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, newPrice, reason }),
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to apply price change: ${res.statusText}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("Apply price change error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Apply all recommended price changes delegating to Django Python agent.
 */
export async function applyAllPriceChanges(
  changes: Array<{ productId: string; newPrice: number; reason: string }>
) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/agent/pricing/apply-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changes }),
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to apply bulk price changes: ${res.statusText}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("Apply bulk price changes error:", error);
    return { success: false, applied: 0, failed: changes.length, error: error.message };
  }
}

/**
 * Get price change history delegating to Django Python agent.
 */
export async function getPricingHistory(productId?: string) {
  try {
    const url = new URL(`${BACKEND_URL}/api/agent/pricing/history`);
    if (productId) {
      url.searchParams.append("productId", productId);
    }

    const res = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to load pricing history: ${res.statusText}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("Get pricing history error:", error);
    return [];
  }
}
