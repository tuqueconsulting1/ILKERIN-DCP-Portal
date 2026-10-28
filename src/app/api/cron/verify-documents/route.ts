import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runVerification } from "@/lib/verification";

// Each file is a model call that can take a minute or more; the per-run cap
// in runVerification keeps the whole batch inside this.
export const maxDuration = 300;

/**
 * Runs after poll-workdrive (see vercel.json): has Claude review the files
 * that poll queued. Returns { enabled: false } and does nothing until
 * verification is switched on - see isVerificationEnabled().
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runVerification(createAdminClient());
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
