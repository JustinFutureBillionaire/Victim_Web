import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

// Demo reset between the OFF and ON runs: clear every ticket reply.
export async function POST() {
  try {
    const { error } = await supabaseAdmin.from("support_tickets").update({ reply: null }).not("reply", "is", null);
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
