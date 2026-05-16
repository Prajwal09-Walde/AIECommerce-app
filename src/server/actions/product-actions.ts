"use server";

import { connectToDatabase } from "@/lib/mongoose";
import Product from "@/models/Product";
import { revalidatePath } from "next/cache";

export async function getProducts() {
  await connectToDatabase();
  const products = await Product.find({}).sort({ createdAt: -1 }).lean();
  
  // Serialize ObjectIDs for the client
  return products.map((p: any) => ({
    ...p,
    _id: p._id.toString(),
  }));
}

export async function addProduct(data: { name: string; price: number; stock: number; category: string }) {
  await connectToDatabase();
  const newProduct = await Product.create(data);
  revalidatePath("/dashboard/products");
  
  const productObj = newProduct.toObject();
  return {
    ...productObj,
    _id: productObj._id.toString(),
  };
}

export async function deleteProduct(id: string) {
  if (!id || id.startsWith("temp-id")) return { success: false }; // Prevent deleting optimistic temp ids
  await connectToDatabase();
  await Product.findByIdAndDelete(id);
  revalidatePath("/dashboard/products");
  return { success: true };
}
