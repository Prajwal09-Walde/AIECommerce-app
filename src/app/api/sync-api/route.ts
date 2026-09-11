import { NextResponse } from "next/server";
import { syncFromApiAction } from "@/actions/product-actions";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await syncFromApiAction();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const result = await syncFromApiAction();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
