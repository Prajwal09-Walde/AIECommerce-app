import { NextResponse } from "next/server";
import { runAlertScan } from "@/actions/alert-agent-actions";

/**
 * API route to trigger an AI alert scan.
 * Can be called via:
 *   - Manual button press from the Alerts dashboard
 *   - Vercel Cron
 *   - External webhook
 */
export async function GET() {
  try {
    const result = await runAlertScan();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const result = await runAlertScan();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
