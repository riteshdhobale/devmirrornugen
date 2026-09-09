/**
 * Minimal streaming client for the Lovable AI Gateway Responses API.
 * Server-only. Always streams (reasoning models run long; buffered calls get
 * severed by platform timeouts), accumulates the structured output text
 * server-side, and returns the parsed JSON.
 */

export interface StructuredCallOptions {
  instructions: string;
  input: string;
  /** Strict json_schema name. */
  schemaName: string;
  /** Strict-compatible JSON Schema: additionalProperties:false, all props required. */
  schema: Record<string, unknown>;
  effort?: "low" | "medium";
  /** Defaults to the existing Lovable baseline. */
  provider?: "baseline" | "nugen";
}

export type AIProviderId = "baseline" | "nugen";

export interface AIResponseMetadata {
  provider: AIProviderId;
  model?: string;
  finishReason?: string | null;
  usage?: Record<string, unknown>;
  /** Present only when Nugen returns a numeric confidence value. */
  confidence?: number;
}

export interface StructuredCallResult<T> {
  data: T;
  metadata: AIResponseMetadata;
}

/** A provider failure that never contains an API key or upstream response body. */
export class AIProviderError extends Error {
  constructor(
    public readonly provider: AIProviderId,
    public readonly status?: number,
  ) {
    super(`${provider} AI request failed${status ? ` (${status})` : ""}`);
    this.name = "AIProviderError";
  }
}

export function resolveAIProvider(provider?: AIProviderId): AIProviderId {
  return provider ?? "baseline";
}

async function callLovableStructured<T>(opts: StructuredCallOptions): Promise<T> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-5.6-sol",
      instructions: opts.instructions,
      input: opts.input,
      stream: true,
      reasoning: { effort: opts.effort ?? "low", summary: "auto" },
      text: {
        format: {
          type: "json_schema",
          name: opts.schemaName,
          strict: true,
          schema: opts.schema,
        },
      },
    }),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(`AI gateway error ${res.status}: ${detail.slice(0, 300)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let completedText = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const event = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of event.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        let evt: {
          type?: string;
          delta?: unknown;
          response?: { output_text?: string; error?: { message?: string } | null };
        };
        try {
          evt = JSON.parse(payload);
        } catch {
          continue; // partial JSON chunk — skip
        }
        if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
          text += evt.delta;
        } else if (evt.type === "response.completed") {
          completedText = evt.response?.output_text ?? "";
        } else if (evt.type === "response.failed") {
          throw new Error(
            `AI generation failed: ${evt.response?.error?.message ?? "unknown upstream error"}`,
          );
        }
      }
    }
  }

  const finalText = text || completedText;
  if (!finalText) throw new Error("AI returned empty output");
  return JSON.parse(finalText) as T;
}

interface NugenCompletion {
  choices?: { text?: unknown; finish_reason?: unknown }[];
  model?: unknown;
  usage?: unknown;
  confidence?: unknown;
}

export function parseNugenJson(text: string): unknown {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new AIProviderError("nugen");
  }
}

function validateStructuredValue(value: unknown, schema: Record<string, unknown>): boolean {
  switch (schema.type) {
    case "object": {
      if (!value || typeof value !== "object" || Array.isArray(value)) return false;
      const record = value as Record<string, unknown>;
      const properties = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
      const required = Array.isArray(schema.required) ? schema.required : [];
      if (required.some((key) => typeof key !== "string" || !(key in record))) return false;
      if (
        schema.additionalProperties === false &&
        Object.keys(record).some((key) => !(key in properties))
      )
        return false;
      return Object.entries(properties).every(
        ([key, property]) => !(key in record) || validateStructuredValue(record[key], property),
      );
    }
    case "array":
      return (
        Array.isArray(value) &&
        (!schema.items ||
          (typeof schema.items === "object" &&
            value.every((item) =>
              validateStructuredValue(item, schema.items as Record<string, unknown>),
            )))
      );
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "boolean":
      return typeof value === "boolean";
    default:
      return true;
  }
}

/** Parses only the fields verified by the live, non-streaming Nugen completion probe. */
export function parseNugenCompletion<T>(
  payload: unknown,
  schema?: Record<string, unknown>,
): StructuredCallResult<T> {
  const completion = payload as NugenCompletion;
  const choice = completion?.choices?.[0];
  if (!choice || typeof choice.text !== "string" || !choice.text.trim()) {
    throw new AIProviderError("nugen");
  }

  const data = parseNugenJson(choice.text);
  if (schema && !validateStructuredValue(data, schema)) throw new AIProviderError("nugen");

  const confidence = typeof completion.confidence === "number" ? completion.confidence : undefined;
  return {
    data: data as T,
    metadata: {
      provider: "nugen",
      model: typeof completion.model === "string" ? completion.model : undefined,
      finishReason: typeof choice.finish_reason === "string" ? choice.finish_reason : null,
      usage:
        completion.usage && typeof completion.usage === "object"
          ? (completion.usage as Record<string, unknown>)
          : undefined,
      // A null (or absent) value remains unavailable; never fabricate it.
      confidence,
    },
  };
}

function nugenPrompt(opts: StructuredCallOptions): string {
  return [
    opts.instructions,
    "",
    "Use only the supplied evidence. Return only a valid JSON object that satisfies this schema:",
    JSON.stringify(opts.schema),
    "",
    "Evidence/task input:",
    opts.input,
  ].join("\n");
}

async function callNugenStructured<T>(
  opts: StructuredCallOptions,
): Promise<StructuredCallResult<T>> {
  const apiKey = process.env["NUGEN_API_KEY"];
  const url = process.env["NUGEN_API_URL"];
  const model = process.env["NUGEN_MODEL_ID"];
  if (!apiKey || !url || !model) throw new AIProviderError("nugen");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt: nugenPrompt(opts),
        max_tokens: 1_200,
        temperature: 0,
        stream: false,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      // Do not parse or surface upstream bodies: they can contain sensitive diagnostics.
      throw new AIProviderError("nugen", response.status);
    }
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new AIProviderError("nugen", response.status);
    }
    return parseNugenCompletion<T>(payload, opts.schema);
  } catch (error) {
    if (error instanceof AIProviderError) throw error;
    throw new AIProviderError("nugen");
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * The stable structured-call boundary. Existing callers keep the Lovable
 * baseline by default; Developer Intelligence opts into Nugen explicitly.
 */
export async function callStructuredWithMetadata<T>(
  opts: StructuredCallOptions,
): Promise<StructuredCallResult<T>> {
  const provider = resolveAIProvider(opts.provider);
  if (provider === "nugen") return callNugenStructured<T>(opts);
  return {
    data: await callLovableStructured<T>(opts),
    metadata: { provider: "baseline", model: "openai/gpt-5.6-sol" },
  };
}

export async function callResponsesStructured<T>(opts: StructuredCallOptions): Promise<T> {
  return (await callStructuredWithMetadata<T>(opts)).data;
}
