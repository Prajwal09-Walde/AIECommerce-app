"use server";

import { requireAuth } from "@/lib/server-auth";
import { connectToDatabase } from "@/lib/mongoose";
import Product from "@/models/Product";
import { revalidatePath } from "next/cache";

/**
 * Example Server Action: Restock a product.
 * This demonstrates how to use the JWT payload utility to strictly 
 * enforce ADMIN privileges before executing database operations.
 */
export async function restockProductAction(productId: string, quantity: number) {
  try {
    // 1. Extract and Verify the JWT Payload (Action Purpose)
    // This will throw an Error if the user is not logged in or is not an ADMIN.
    const payload = await requireAuth("ADMIN");

    // 2. Perform the secure operation
    await connectToDatabase();
    
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    product.stock += quantity;
    await product.save();

    // Revalidate the frontend cache so the updated stock appears immediately
    revalidatePath("/dashboard/products");

    return { 
      success: true, 
      message: `Product restocked successfully by Admin: ${payload.name}`,
      newStockLevel: product.stock
    };
    
  } catch (error: any) {
    console.error("Action Error:", error.message);
    return { success: false, error: error.message };
  }
}
