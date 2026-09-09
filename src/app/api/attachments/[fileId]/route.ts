import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { downloadWorkdriveFile } from "@/lib/zoho";

// Proxies a WorkDrive file through the app's own Zoho service account so any
// signed-in staff member can view an attachment, regardless of whether they
// personally have a Zoho seat with access to this org's WorkDrive -- see the
// comment on downloadWorkdriveFile() for why that matters. /api/ routes are
// excluded from the session middleware (see proxy.ts), so the auth check
// happens here instead.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { fileId } = await params;
  const name = new URL(request.url).searchParams.get("name") || "attachment";
  const asciiName = name.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");

  try {
    const { buffer, contentType } = await downloadWorkdriveFile(fileId);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "private, max-age=0, no-store",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
