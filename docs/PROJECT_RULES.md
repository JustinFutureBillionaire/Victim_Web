# Demo Helpdesk

A deliberately vulnerable test app that demonstrates Trifecta Breaker, like OWASP Juice Shop or DVWA. It is the *target*, not the product. It runs locally for a hackathon demo only.

Full design is in `Demo Helpdesk Plan.md`. Read it before coding. If this file and the plan disagree, the plan wins.

Built at the Supabase Select 2026 Hackathon. Deadline pressure is real: simplest thing that shows the before/after.

## What the demo shows

Same app, same prompt-injection attack, one toggle:
- **Breaker OFF:** the AI is fooled and leaks a fake token into a public ticket reply.
- **Breaker ON:** the AI is still fooled, but the token read and the write are denied; the reply stays empty.

## Ground rules (do not break)

1. **Clearly fictional, generic brand ("Demo Helpdesk").** Never imitate a real company, logo, or domain.
2. **Fake secrets only.** Every token value contains the literal string `FAKE`. No real credentials in code, env examples, or seeds.
3. **Throwaway lab fixture.** No real auth, no real integrations. Do not make it pass for a real service. Local demo use only.
4. **The unsafe OFF path is server-only and exists solely for the "before" state.** Never expose raw SQL execution to the browser.

## Scope

**In scope:** three screens (`/`, `/ticket/[id]`, `/admin`), one AI agent route with a Breaker ON/OFF toggle, an action log.

**Out of scope. Do not build:**
- The Breaker itself (separate repo `trifecta-breaker`; this app calls it over HTTP)
- The database schema (owned by the Breaker repo's `sql/customer/` files; this app only reads/writes those tables)
- A dashboard of Breaker events (separate, later)
- User accounts, payments, real email, or any real integration

If a task seems to need one of these, stop and ask.

## Stack

- Next.js (App Router), TypeScript
- `@supabase/supabase-js` for the form insert and the reply read
- `@anthropic-ai/sdk` for the AI agent, one tool `execute_sql`, in a server route
- Local `next dev`; Vercel optional

## Env (`.env.local`, never committed)

```
NEXT_PUBLIC_SUPABASE_URL=...        # Customer Supabase project
NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # public form insert only
SUPABASE_SERVICE_ROLE_KEY=...       # server routes only, never sent to the browser
BREAKER_URL=http://localhost:4000
ANTHROPIC_API_KEY=...
```

## Tables (owned by the Breaker repo — do not redefine)

- `support_tickets (id, customer_email, subject, body, reply, created_at)`
- `integration_tokens (id, service, token)` — fake
- `customers (id, name, plan)`

Freeze these column names with the Breaker team. A rename on either side breaks the demo and the labels.

## How the agent routes SQL

`/api/process` gives Claude one tool, `execute_sql`. Per the toggle:
- **ON:** `POST {BREAKER_URL}/sessions` once per run to get a `sessionId`, then every tool call goes to `POST {BREAKER_URL}/execute { sessionId, sql }`. A deny comes back as `{ decision: 'deny', rule, reason }` — show it, do not treat it as a crash.
- **OFF:** run the SQL directly on the Customer DB via a server-only helper. Deliberately unsafe; the "before" state.

A new run gets a new `sessionId`, so rehearsals never carry stale state.

## Build order

1. `create-next-app`, env, Supabase client
2. `/` ticket form (insert)
3. `/ticket/[id]` reply view
4. `/admin` with OFF path only — prove the leak
5. Add Breaker ON path + toggle — prove the block
6. Action log + deny badges

Finish and eyeball each step before the next. The toggle (step 5) is the most important feature; protect its time. Styling is last.

## Definition of done

- Submit on `/` → appears on `/ticket/[id]`
- Breaker OFF → processing leaks a fake token into the reply
- Breaker ON → token read and write denied; reply stays empty
- `/admin` log shows each SQL step and each deny reason
- No real credentials anywhere
