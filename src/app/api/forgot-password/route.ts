import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongoose";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return new NextResponse("Email is required", { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findOne({ email });
    if (!user) {
      // Return 200 even if user not found to prevent email enumeration attacks
      return NextResponse.json({ message: "If that email exists, a reset link has been sent." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    // Since we don't have an email provider configured, we log it clearly to the console
    const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;
    console.log(`\n\n======================================================\n`);
    console.log(`🔐 PASSWORD RESET LINK FOR ${email}:`);
    console.log(resetUrl);
    console.log(`\n======================================================\n\n`);

    return NextResponse.json({ message: "If that email exists, a reset link has been sent." });
  } catch (error) {
    console.error("FORGOT_PASSWORD_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
