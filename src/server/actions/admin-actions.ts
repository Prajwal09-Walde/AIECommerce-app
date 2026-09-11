"use server";

import { requireAuth } from "@/lib/server-auth";
import { revalidatePath } from "next/cache";

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/['"]/g, "");

/**
 * Server Action: Restock a product in Django backend.
 */
export async function restockProductAction(productId: string, quantity: number) {
  try {
    const payload = await requireAuth("ADMIN");

    // 1. Fetch current product
    const getRes = await fetch(`${BACKEND_URL}/api/products/${productId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!getRes.ok) {
      throw new Error("Product not found");
    }

    const currentProduct = await getRes.json();
    const newStock = (currentProduct.stock || 0) + quantity;

    // 2. Patch stock
    const patchRes = await fetch(`${BACKEND_URL}/api/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock: newStock }),
    });

    if (!patchRes.ok) {
      throw new Error("Failed to update product stock");
    }

    revalidatePath("/dashboard/products");

    return { 
      success: true, 
      message: `Product restocked successfully by Admin: ${payload.name}`,
      newStockLevel: newStock,
    };
    
  } catch (error: any) {
    console.error("Action Error:", error.message);
    return { success: false, error: error.message };
  }
}
