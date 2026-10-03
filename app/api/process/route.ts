import { runAgent, type AgentEvent } from "@/lib/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Only two booleans are accepted. SQL never comes from the request.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const breakerOn = body?.breakerOn === true;
  const scripted = body?.scripted === true;

  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (e: AgentEvent) => {
        try {
          controller.enqueue(enc.encode(JSON.stringify(e) + "\n"));
        } catch {
          // client went away; let the run finish quietly
        }
      };
      runAgent({ breakerOn, scripted, emit: send })
        .catch((e: unknown) => {
          send({ type: "error", message: e instanceof Error ? e.message : String(e) });
          send({ type: "done" });
        })
        .finally(() => {
          try {
            controller.close();
          } catch {}
        });
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
}
