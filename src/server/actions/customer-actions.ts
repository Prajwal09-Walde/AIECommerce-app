"use server";

const BACKEND_URL = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production" ? "https://aiecommerce-backend.onrender.com" : "http://localhost:8000")
).replace(/['"]/g, "");

export async function getCustomerIntelligence() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/customers`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch customer intelligence: ${res.statusText}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("Error fetching customer intelligence:", error);
    return {
      hasData: false,
      totalCustomers: 0,
      segmentData: [],
      paymentData: [],
      topCustomers: [],
      error: error.message,
    };
  }
}
