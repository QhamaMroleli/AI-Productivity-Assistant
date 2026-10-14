// Server-only Lovable AI Gateway helper (OpenAI Responses API, streamed SSE).
const GATEWAY = "https://ai.gateway.lovable.dev/v1/responses";
export const AI_MODEL = "openai/gpt-6-astra";

type InputMessage = { role: "user" | "assistant"; content: string };

export class AIError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function friendly(status: number, raw: string): string {
  let msg = raw;
  try {
    const j = JSON.parse(raw);
    msg = j?.error?.message ?? j?.message ?? raw;
  } catch {
    /* keep raw */
  }
  if (status === 429) return "The AI service is busy right now. Please wait a moment and try again.";
  if (status === 402) return msg || "AI credits are exhausted for this workspace. Add credits to continue.";
  if (status === 401) return "The AI service is not configured correctly (missing or invalid key).";
  if (status === 403) return msg || "Access to the AI model was denied.";
  if (status >= 500) return "The AI service had a temporary problem. Please try again.";
  return msg?.slice(0, 300) || "The AI request failed.";
}

// Very small per-isolate usage control.
const usage = new Map<string, number[]>();
export function checkRateLimit(userId: string, max = 20, windowMs = 60_000) {
  const now = Date.now();
  const list = (usage.get(userId) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) throw new AIError(429, "You're sending requests too quickly. Please wait a minute.");
  list.push(now);
  usage.set(userId, list);
}

export async function callAI(opts: {
  system: string;
  input: string | InputMessage[];
  schema?: { name: string; schema: Record<string, unknown> };
}): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new AIError(401, "AI is not configured: LOVABLE_API_KEY is missing on the server.");

  const body: Record<string, unknown> = {
    model: AI_MODEL,
    instructions: opts.system,
    input: opts.input,
    stream: true,
    store: false,
    reasoning: { effort: "low", summary: "auto" },
    include: ["reasoning.encrypted_content"],
  };
  if (opts.schema) {
    body.text = {
      format: { type: "json_schema", name: opts.schema.name, schema: opts.schema.schema, strict: true },
    };
  }

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    const raw = await res.text().catch(() => "");
    throw new AIError(res.status, friendly(res.status, raw));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let refusal = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        let evt: { type?: string; delta?: string; error?: { message?: string }; response?: { error?: { message?: string } } };
        try {
          evt = JSON.parse(data);
        } catch {
          continue;
        }
        if (evt.type === "response.output_text.delta" && evt.delta) text += evt.delta;
        else if (evt.type === "response.refusal.delta" && evt.delta) refusal += evt.delta;
        else if (evt.type === "error" || evt.type === "response.failed") {
          throw new AIError(500, evt.error?.message ?? evt.response?.error?.message ?? "The AI response failed.");
        }
      }
    }
  }
  if (!text && refusal) throw new AIError(400, `The AI declined this request: ${refusal}`);
  if (!text) throw new AIError(500, "The AI returned an empty response. Please try again.");
  return text;
}

export async function callAIJson<T>(opts: Parameters<typeof callAI>[0]): Promise<T> {
  const raw = await callAI(opts);
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new AIError(500, "The AI returned an unreadable result. Please try again.");
  }
}
