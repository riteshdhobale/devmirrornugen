import { resolvePaddlePrice } from "@/utils/payments.functions";

const clientToken = import.meta.env['VITE_PAYMENTS_CLIENT_TOKEN'];

declare global {
  interface Window {
    Paddle: any;
  }
}

/** Single source of truth for which Paddle environment the client is in. */
export function getPaddleEnvironment(): "sandbox" | "live" {
  return clientToken?.startsWith("test_") ? "sandbox" : "live";
}

let paddleInitialized = false;

export async function initializePaddle() {
  if (paddleInitialized) return;

  if (!clientToken) {
    throw new Error("VITE_PAYMENTS_CLIENT_TOKEN is not set");
  }

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.onload = () => {
      // Paddle.js expects "production", not "live", for Environment.set().
      const paddleJsEnvironment = getPaddleEnvironment() === "sandbox" ? "sandbox" : "production";
      window.Paddle.Environment.set(paddleJsEnvironment);
      window.Paddle.Initialize({ token: clientToken });
      paddleInitialized = true;
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export async function getPaddlePriceId(priceId: string): Promise<string> {
  const environment = getPaddleEnvironment();
  return resolvePaddlePrice({ data: { priceId, environment } });
}

/**
 * Localized price preview. Paddle geolocates the visitor by IP and returns
 * already-formatted amounts in their currency, honouring the regional
 * overrides configured on each price (India / SEA / Europe).
 * Returns a map of human-readable price ID → formatted amount.
 */
export async function previewLocalizedPrices(
  priceIds: string[],
): Promise<Record<string, string>> {
  await initializePaddle();
  const internal = await Promise.all(
    priceIds.map(async (id) => [id, await getPaddlePriceId(id)] as const),
  );
  const byInternal = new Map(internal.map(([external, id]) => [id, external]));

  const result = await window.Paddle.PricePreview({
    items: internal.map(([, id]) => ({ priceId: id, quantity: 1 })),
  });

  const out: Record<string, string> = {};
  for (const line of result?.data?.details?.lineItems ?? []) {
    const external = byInternal.get(line.price?.id);
    if (external) out[external] = line.formattedTotals?.subtotal ?? "";
  }
  return out;
}
