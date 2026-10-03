import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type Ticket = { id: string | number; subject: string; reply: string | null; created_at: string };

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  let id = rawId;
  try {
    id = decodeURIComponent(rawId);
  } catch {}

  let ticket: Ticket | null = null;
  let error: string | null = null;
  try {
    const r = await supabaseAdmin
      .from("support_tickets")
      .select("id, subject, reply, created_at")
      .eq("id", id)
      .maybeSingle<Ticket>();
    ticket = r.data;
    // 22P02 = id doesn't cast to the column type (e.g. "abc" for bigint): same as missing.
    error = r.error && r.error.code !== "22P02" ? r.error.message : null;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  // Plain <a> forces a full reload so the latest reply is always fetched.
  const refresh = <a href={`/ticket/${encodeURIComponent(id)}`}>Refresh</a>;

  if (error) {
    return (
      <div className="narrow">
        <h1>Ticket #{id}</h1>
        <p className="notice bad">Could not load ticket: {error}</p>
        {refresh}
      </div>
    );
  }
  if (!ticket) {
    return (
      <div className="narrow">
        <p className="eyebrow">Support</p>
        <h1>Ticket not found</h1>
        <p className="lead">We couldn’t find a ticket with id {id}.</p>
        <p>
          <Link href="/">← Submit a new request</Link>
        </p>
      </div>
    );
  }

  const replied = Boolean(ticket.reply);

  return (
    <div className="narrow">
      <p className="eyebrow">Ticket #{String(ticket.id)}</p>
      <div className="ticket-head">
        <h1 style={{ margin: 0 }}>{ticket.subject}</h1>
        <span className={`status ${replied ? "replied" : "open"}`}>{replied ? "Replied" : "Open"}</span>
      </div>
      <p className="meta-row">
        Opened {new Date(ticket.created_at).toLocaleString()} · {refresh}
      </p>

      <div className="card">
        <p className="convo-label">Support reply</p>
        {ticket.reply ? (
          <pre className="reply">{ticket.reply}</pre>
        ) : (
          <pre className="reply empty">No reply yet — our team is on it.</pre>
        )}
      </div>
    </div>
  );
}
