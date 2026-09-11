import { NextRequest, NextResponse } from "next/server";
import { getOrders } from "@/actions/order-actions";
const BACKEND_URL = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production" ? "https://aiecommerce-backend.onrender.com" : "http://localhost:8000")
).replace(/['"]/g, "");

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const search = searchParams.get("search") || "";

    const data = await getOrders(page, limit, search);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ orders: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 1 }, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
