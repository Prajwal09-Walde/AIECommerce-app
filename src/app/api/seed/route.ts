import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import User from "@/models/User";
import Product from "@/models/Product";
import Order from "@/models/Order";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();

    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});

    // Create Dummy Users
    const hashedPassword = await bcrypt.hash("password123", 10);
    const users = await User.insertMany([
      { name: "Admin User", email: "admin@example.com", password: hashedPassword, role: "ADMIN" },
      { name: "John Doe", email: "john@example.com", password: hashedPassword, role: "USER" },
      { name: "Jane Smith", email: "jane@example.com", password: hashedPassword, role: "USER" },
    ]);

    // Create Dummy Products
    const products = await Product.insertMany([
      { name: "Wireless Earbuds Pro", category: "Electronics", price: 129.99, stock: 45 },
      { name: "Mechanical Keyboard V2", category: "Electronics", price: 149.50, stock: 12 },
      { name: "Ergonomic Office Chair", category: "Furniture", price: 299.00, stock: 8 },
      { name: "Stainless Steel Water Bottle", category: "Accessories", price: 24.99, stock: 150 },
      { name: "Smart Watch Series 5", category: "Electronics", price: 199.99, stock: 30 },
      { name: "Noise Cancelling Headphones", category: "Electronics", price: 249.00, stock: 5 },
    ]);

    // Create Dummy Orders
    await Order.insertMany([
      {
        customer: "John Doe",
        totalAmount: 129.99,
        status: "Shipped",
        items: [
          { productId: products[0]._id, quantity: 1, price: 129.99 }
        ]
      },
      {
        customer: "Jane Smith",
        totalAmount: 448.50,
        status: "Processing",
        items: [
          { productId: products[1]._id, quantity: 1, price: 149.50 },
          { productId: products[2]._id, quantity: 1, price: 299.00 }
        ]
      },
      {
        customer: "Alice Johnson",
        totalAmount: 49.98,
        status: "Pending",
        items: [
          { productId: products[3]._id, quantity: 2, price: 24.99 }
        ]
      }
    ]);

    return NextResponse.json({ message: "Database seeded successfully with dummy data!" });
  } catch (error: any) {
    console.error("Seeding error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
