import { afterEach, describe, expect, test } from "bun:test";
import {
  AIProviderError,
  callStructuredWithMetadata,
  parseNugenCompletion,
  parseNugenJson,
  resolveAIProvider,
} from "./ai-gateway.server";

const schema = {
  type: "object",
  additionalProperties: false,
  properties: { summary: { type: "string" } },
  required: ["summary"],
};

const completion = (text = '{"summary":"grounded"}') => ({
  choices: [{ text, finish_reason: "stop" }],
  model: "aligned-model-test",
  usage: { prompt_tokens: 4, completion_tokens: 3, total_tokens: 7 },
  confidence: null,
});

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env = { ...originalEnv };
});

describe("Nugen completion adapter", () => {
  test("extracts text, finish reason, usage, model, and leaves null confidence unavailable", () => {
    const result = parseNugenCompletion<{ summary: string }>(completion(), schema);
    expect(result.data).toEqual({ summary: "grounded" });
    expect(result.metadata).toEqual({
      provider: "nugen",
      model: "aligned-model-test",
      finishReason: "stop",
      usage: { prompt_tokens: 4, completion_tokens: 3, total_tokens: 7 },
      confidence: undefined,
    });
  });

  test("rejects missing choices, malformed JSON, and JSON that violates the schema", () => {
    expect(() => parseNugenCompletion({}, schema)).toThrow(AIProviderError);
    expect(() => parseNugenJson("not json")).toThrow(AIProviderError);
    expect(() => parseNugenCompletion(completion('{"other":"value"}'), schema)).toThrow(
      AIProviderError,
    );
  });

  test("uses Nugen only when explicitly selected", async () => {
    process.env.NUGEN_API_KEY = "__TEST_NUGEN_KEY__";
    process.env.NUGEN_API_URL = "https://nugen.test/completions";
    process.env.NUGEN_MODEL_ID = "aligned-model-test";
    globalThis.fetch = async () => new Response(JSON.stringify(completion()), { status: 200 });

    const result = await callStructuredWithMetadata<{ summary: string }>({
      provider: "nugen",
      instructions: "Use evidence.",
      input: "{}",
      schemaName: "test",
      schema,
    });
    expect(result.metadata.provider).toBe("nugen");
    expect(result.data.summary).toBe("grounded");
  });

  test("sanitizes Nugen 401, 404, and 5xx errors without exposing the API key", async () => {
    process.env.NUGEN_API_KEY = "__TEST_NUGEN_KEY__";
    process.env.NUGEN_API_URL = "https://nugen.test/completions";
    process.env.NUGEN_MODEL_ID = "aligned-model-test";

    for (const status of [401, 404, 500]) {
      globalThis.fetch = async () =>
        new Response('{"detail":"upstream diagnostics containing __TEST_NUGEN_KEY__"}', { status });
      try {
        await callStructuredWithMetadata({
          provider: "nugen",
          instructions: "x",
          input: "x",
          schemaName: "x",
          schema,
        });
        throw new Error("expected provider error");
      } catch (error) {
        expect(error).toMatchObject({ provider: "nugen", status });
        expect(String(error)).not.toContain("__TEST_NUGEN_KEY__");
        expect(String(error)).not.toContain("upstream diagnostics");
      }
    }
  });

  test("keeps Lovable as the default provider", () => {
    expect(resolveAIProvider()).toBe("baseline");
    expect(resolveAIProvider("nugen")).toBe("nugen");
  });
});
