import { NextResponse } from "next/server";
import { getCustomerIntelligence } from "@/actions/customer-actions";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getCustomerIntelligence();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ hasData: false, error: error.message }, { status: 500 });
  }
}
