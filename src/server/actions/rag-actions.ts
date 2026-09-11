"use server";

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/['"]/g, "");

export async function runAutomatedRAGAnalysis(
  focus: string, 
  customGuidelines: string
): Promise<{ success: boolean; logs: string[]; retrievedChunks?: string[]; analysis?: any; error?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/analyze/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        focus,
        guidelines: customGuidelines,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Failed to run RAG analysis: ${res.statusText}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("RAG analysis error:", error);
    return {
      success: false,
      logs: [],
      error: error.message,
    };
  }
}
