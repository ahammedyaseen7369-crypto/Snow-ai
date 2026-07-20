import { API_BASE_URL, REQUEST_TIMEOUT_MS } from "../config";

/**
 * Sends a message to the Snow backend and returns { response, intent }.
 * Throws a SnowApiError with a human-readable message on failure — the UI
 * is responsible for displaying it, never swallowing it silently.
 */
export class SnowApiError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "SnowApiError";
    this.cause = cause;
  }
}

export async function sendMessage(message) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new SnowApiError(
        body.error || `Snow's backend returned an error (${res.status}).`
      );
    }

    const data = await res.json();
    return { response: data.response, intent: data.intent };
  } catch (err) {
    if (err.name === "AbortError") {
      throw new SnowApiError(
        "Snow is taking longer than expected to respond. The model may still be loading, or your device may be under load."
      );
    }
    if (err instanceof SnowApiError) throw err;
    throw new SnowApiError(
      `Couldn't reach Snow's backend at ${API_BASE_URL}. Is app.py running?`,
      err
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { method: "GET" });
    if (!res.ok) return { ok: false, modelLoaded: false };
    const data = await res.json();
    return { ok: true, modelLoaded: !!data.model_loaded };
  } catch {
    return { ok: false, modelLoaded: false };
  }
}
