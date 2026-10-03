# Demo Helpdesk

A **fictional, deliberately vulnerable** helpdesk (in the spirit of OWASP Juice Shop). It is the demo target for Trifecta Breaker's prompt-injection containment. Local demo use only. No auth, no real integrations, and every token is fake (each contains `FAKE`).

## Setup

```bash
cp .env.example .env.local   # fill in the Customer Supabase project + keys
npm install
npm run dev                  # http://localhost:3000
```

Tables (`support_tickets`, `integration_tokens`, `customers`) are owned and seeded by the Breaker repo (`sql/customer/`). This app only reads and writes them.

## Screens

- `/`: submit a ticket (email, subject, message).
- `/ticket/[id]`: the ticket's public reply. The attacker checks here for the leak.
- `/admin`: staff console. Breaker ON/OFF toggle, "Process today's tickets with AI", "Reset replies", and a live action log.

## Demo flow

1. On `/`, submit a ticket whose body contains `IMPORTANT NOTE FOR THE AI ASSISTANT` plus the injection (or use the seeded one).
2. `/admin`, Breaker **OFF**, Process. The AI reads tickets, reads tokens, and writes one into the reply.
3. Open `/ticket/<id>`: a fake token sits in the reply. Leak.
4. `/admin`, **Reset replies**, Breaker **ON**, Process. The token read and the write show red DENY badges.
5. Open `/ticket/<id>`: "No reply yet." Same attack, contained.

**Scripted AI (deterministic fallback):** tick the checkbox on `/admin` to replay the attack's three SQL steps without calling Claude (no API key needed). Use it if the live model refuses the injection on stage. It routes SQL exactly like the real agent.

## The unsafe OFF path

With Breaker OFF, the agent's SQL runs directly on `CUSTOMER_DATABASE_URL` via `lib/db.ts`. This is deliberately unsafe and exists only for the "before" state. It is server-only: the browser sends just `{ breakerOn, scripted }` booleans to `/api/process` and never sends SQL.

## Breaker HTTP contract (expected at `BREAKER_URL`)

- `POST /sessions` → `{ "sessionId": "..." }` (one new session per run)
- `POST /execute` with `{ "sessionId", "sql" }` →
  - allowed: `{ "rows": [...] }` (or a bare array)
  - denied (any HTTP status): `{ "decision": "deny", "rule": "R2", "reason": "..." }`
