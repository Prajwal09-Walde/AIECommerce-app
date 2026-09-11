"use server";

import { revalidatePath } from "next/cache";
const BACKEND_URL = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production" ? "https://aiecommerce-backend.onrender.com" : "http://localhost:8000")
).replace(/['"]/g, "");

export async function getProducts(page: number = 1, limit: number = 24, search: string = "") {
  try {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      search: search || "",
    });
    const res = await fetch(`${BACKEND_URL}/api/products?${params.toString()}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch products: ${res.statusText}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("Error fetching products:", error);
    return {
      products: [],
      total: 0,
      totalPages: 1,
      page,
      error: error.message,
    };
  }
}

export async function addProduct(data: { name: string; price: number; stock: number; category: string }) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      throw new Error(`Failed to add product: ${res.statusText}`);
    }

    const result = await res.json();
    revalidatePath("/dashboard/products");
    return result.product;
  } catch (error: any) {
    console.error("Error adding product:", error);
    throw error;
  }
}

export async function deleteProduct(id: string) {
  if (!id || id.startsWith("temp-id")) return { success: false };
  try {
    const res = await fetch(`${BACKEND_URL}/api/products/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      throw new Error(`Failed to delete product: ${res.statusText}`);
    }

    revalidatePath("/dashboard/products");
    return await res.json();
  } catch (error: any) {
    console.error("Error deleting product:", error);
    return { success: false, error: error.message };
  }
}
