import { NextResponse } from "next/server";
import { paymentOptions } from "@/src/lib/payments";

export async function GET() {
  return NextResponse.json({
    instructions: {
      meezan: paymentOptions.meezan,
      upaisa: paymentOptions.upaisa,
      secondaryWallet: paymentOptions.secondaryWallet,
      citibank: paymentOptions.citibank,
      crypto: paymentOptions.crypto,
    },
  }, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" } });
}