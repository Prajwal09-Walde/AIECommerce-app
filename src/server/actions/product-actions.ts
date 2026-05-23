"use server";

import { connectToDatabase } from "@/lib/mongoose";
import Product from "@/models/Product";
import { revalidatePath } from "next/cache";

export async function getProducts(page: number = 1, limit: number = 24, search: string = "") {
  await connectToDatabase();
  
  const query: any = {};
  if (search) {
    query.name = { $regex: search, $options: "i" };
  }

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Product.countDocuments(query),
  ]);
  
  // Serialize ObjectIDs for the client
  return {
    products: products.map((p: any) => ({
      ...p,
      _id: p._id.toString(),
    })),
    total,
    totalPages: Math.ceil(total / limit),
  };
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
