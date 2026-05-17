import { NextResponse } from "next/server";
import mongoose from "mongoose";

export async function GET() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      return NextResponse.json({ status: "error", message: "MONGODB_URI is undefined" });
    }

    // Try to connect with a 5-second timeout so it doesn't hang forever
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    
    const dbName = mongoose.connection.db ? mongoose.connection.db.databaseName : "unknown";
    
    return NextResponse.json({ 
      status: "success", 
      message: "Successfully connected to MongoDB!", 
      database: dbName 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      status: "error", 
      message: error.message,
      name: error.name
    });
  }
}
