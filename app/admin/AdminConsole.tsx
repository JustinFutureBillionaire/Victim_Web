"use client";

import { useState } from "react";
import s from "./admin.module.css";

// Mirror of AgentEvent in lib/agent.ts (that file is server-only, so it is not imported here).
type AgentEvent =
  | { type: "start"; breakerOn: boolean; scripted: boolean; sessionId?: string }
  | { type: "text"; text: string }
  | { type: "sql"; step: number; sql: string }
  | { type: "result"; step: number; rowCount: number | null; rows: unknown[] }
  | { type: "deny"; step: number; rule: string; reason: string }
  | { type: "error"; step?: number; message: string }
  | { type: "done" };

function preview(rows: unknown[]) {
  const json = JSON.stringify(rows.slice(0, 5), null, 1);
  return json.length > 800 ? json.slice(0, 800) + " …" : json;
}

export default function AdminConsole() {
  const [breakerOn, setBreakerOn] = useState(false);
  const [scripted, setScripted] = useState(false);
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [resetMsg, setResetMsg] = useState("");

  const push = (e: AgentEvent) => setEvents((prev) => [...prev, e]);
  const pushLine = (line: string) => {
    if (!line.trim()) return;
    try {
      push(JSON.parse(line) as AgentEvent);
    } catch {
      push({ type: "error", message: `Bad stream line: ${line.slice(0, 200)}` });
    }
  };

  async function processTickets() {
    setRunning(true);
    setEvents([]);
    setResetMsg("");
    try {
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ breakerOn, scripted }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        lines.forEach(pushLine);
      }
      pushLine(buf + dec.decode());
    } catch (err) {
      push({ type: "error", message: err instanceof Error ? err.message : String(err) });
    } finally {
      setRunning(false);
    }
  }

  async function resetReplies() {
    setRunning(true);
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      const j = (await res.json()) as { ok: boolean; error?: string };
      setResetMsg(j.ok ? "Replies cleared." : `Reset failed: ${j.error ?? res.status}`);
    } catch (err) {
      setResetMsg(`Reset failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunning(false);
    }
  }

  const outcomeOf = (step: number) =>
    events.find((e) => (e.type === "result" || e.type === "deny" || e.type === "error") && e.step === step);

  const start = events.find((e) => e.type === "start");

  return (
    <div className={s.panel}>
      <div className={s.bar}>
        <div className={s.breaker}>
          <button
            type="button"
            role="switch"
            aria-checked={breakerOn}
            className={`${s.toggle} ${breakerOn ? s.on : s.off}`}
            onClick={() => setBreakerOn((v) => !v)}
            disabled={running}
          >
            {breakerOn ? "ON" : "OFF"}
          </button>
          <span className={s.breakerLabel}>
            <b>Trifecta Breaker</b>
            <span>{breakerOn ? "Protecting the agent’s data access" : "Unprotected — direct SQL"}</span>
          </span>
        </div>

        <label className={s.check}>
          <input type="checkbox" checked={scripted} onChange={(e) => setScripted(e.target.checked)} disabled={running} />
          Scripted AI (deterministic fallback)
        </label>

        <div className={s.actions}>
          {resetMsg && <span className={s.resetMsg}>{resetMsg}</span>}
          <button type="button" className="btn secondary" onClick={resetReplies} disabled={running}>
            Reset replies
          </button>
          <button type="button" className="btn" onClick={processTickets} disabled={running}>
            {running ? "Running…" : "Process today’s tickets"}
          </button>
        </div>
      </div>

      <div className={s.logCard}>
        <div className={s.logHead}>
          <h2>Action log</h2>
          {start?.type === "start" && (
            <span className={s.runpill}>{start.breakerOn ? "Breaker ON" : "Breaker OFF"}</span>
          )}
        </div>
        <div className={s.log}>
          {events.length === 0 && <p className={s.empty}>No run yet. Flip the toggle and process tickets to see the agent’s SQL steps.</p>}
          {events.map((e, i) => {
            switch (e.type) {
              case "start":
                return (
                  <div key={i} className={`${s.header} ${e.breakerOn ? s.on : s.off}`}>
                    {e.breakerOn ? "Breaker ON" : "Breaker OFF (direct SQL, unsafe)"} · {e.scripted ? "Scripted AI" : "Live AI"}
                    {e.sessionId && (
                      <>
                        · session <code>{e.sessionId}</code>
                      </>
                    )}
                  </div>
                );
              case "text":
                return (
                  <p key={i} className={s.narration}>
                    <b>AI</b>
                    <span>{e.text}</span>
                  </p>
                );
              case "sql": {
                const o = outcomeOf(e.step);
                return (
                  <div key={i} className={s.step}>
                    <div className={s.stepLabel}>Step {e.step}</div>
                    <pre className={s.sql}>{e.sql}</pre>
                    {!o && <div className={s.running}>running…</div>}
                    {o?.type === "result" && (
                      <div className={s.outcome}>
                        <span className={`${s.badge} ${s.allow}`}>OK</span>
                        <span>
                          {o.rowCount ?? o.rows.length} row(s)
                          {o.rows.length > 0 && <pre className={s.rows}>{preview(o.rows)}</pre>}
                        </span>
                      </div>
                    )}
                    {o?.type === "deny" && (
                      <div className={s.outcome}>
                        <span className={`${s.badge} ${s.deny}`}>DENY {o.rule}</span>
                        <span>{o.reason}</span>
                      </div>
                    )}
                    {o?.type === "error" && <div className={s.error}>Error: {o.message}</div>}
                  </div>
                );
              }
              case "error":
                return e.step === undefined ? (
                  <div key={i} className={s.error}>
                    Error: {e.message}
                  </div>
                ) : null;
              case "done":
                return (
                  <div key={i} className={s.done}>
                    Run complete.
                  </div>
                );
              default:
                return null;
            }
          })}
        </div>
      </div>
    </div>
  );
}
