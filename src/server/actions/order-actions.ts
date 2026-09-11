"use server";

const BACKEND_URL = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production" ? "https://aiecommerce-backend.onrender.com" : "http://localhost:8000")
).replace(/['"]/g, "");

export async function getOrders(page: number = 1, limit: number = 50, search: string = "") {
  try {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      search: search || "",
    });
    const res = await fetch(`${BACKEND_URL}/api/orders?${params.toString()}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch orders: ${res.statusText}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("Error fetching orders:", error);
    return {
      orders: [],
      pagination: {
        total: 0,
        page,
        limit,
        totalPages: 1,
      },
      error: error.message,
    };
  }
}
