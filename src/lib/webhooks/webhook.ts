export async function sendWithRetry(
  url: string,
  body: unknown,
  options?: {
    headers?: Record<string, string>;
    attempts?: number;
    baseDelayMs?: number;
  }
) {
  const attempts = Math.max(1, options?.attempts ?? 3);
  const baseDelay = options?.baseDelayMs ?? 300;

  console.log(
    `📡 [sendWithRetry] Starting webhook to ${url} (${attempts} attempts)`
  );

  let lastError: unknown = null;
  for (let i = 0; i < attempts; i++) {
    try {
      console.log(`🔄 [sendWithRetry] Attempt ${i + 1}/${attempts} to ${url}`);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(options?.headers ?? {}),
        },
        body: JSON.stringify(body),
      });

      console.log(
        `📥 [sendWithRetry] Response: ${res.status} ${res.statusText}`
      );

      if (res.ok) {
        console.log(
          `✅ [sendWithRetry] Webhook successful on attempt ${i + 1}`
        );
        return true;
      }

      const responseText = await res.text().catch(() => "");
      lastError = new Error(`HTTP ${res.status}: ${responseText}`);
      console.warn(
        `⚠️ [sendWithRetry] Attempt ${i + 1} failed: ${res.status} - ${responseText}`
      );
    } catch (e) {
      lastError = e;
      console.error(`❌ [sendWithRetry] Attempt ${i + 1} error:`, e);
    }

    if (i < attempts - 1) {
      // backoff
      const delay = baseDelay * Math.pow(2, i);
      console.log(`⏳ [sendWithRetry] Waiting ${delay}ms before retry...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  console.error("❌ [sendWithRetry] All attempts failed", {
    url,
    error: (lastError as any)?.message,
  });

  return false;
}
