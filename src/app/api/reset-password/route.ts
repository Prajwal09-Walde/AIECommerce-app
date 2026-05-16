import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongoose";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    await connectToDatabase();

    // Verify token exists and has not expired
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() } 
    });

    if (!user) {
      return new NextResponse("Invalid or expired reset token", { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password and clear the reset tokens
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    return NextResponse.json({ message: "Password has been reset successfully" });
  } catch (error) {
    console.error("RESET_PASSWORD_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
