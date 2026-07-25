import { API_BASE_URL, REQUEST_TIMEOUT_MS } from "../config";

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
      throw new SnowApiError(body.error || `Snow's backend returned an error (${res.status}).`);
    }
    const data = await res.json();
    return { response: data.response, intent: data.intent };
  } catch (err) {
    if (err.name === "AbortError") throw new SnowApiError("Snow is taking longer than expected to respond.");
    if (err instanceof SnowApiError) throw err;
    throw new SnowApiError(`Couldn't reach Snow's backend at ${API_BASE_URL}. Is app.py running?`, err);
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { method: "GET" });
    if (!res.ok) return { ok: false, modelLoaded: false, memories: 0, interactions: 0 };
    const data = await res.json();
    return { ok: true, modelLoaded: data.chat_model !== "Not loaded", memories: data.memories ?? 0, interactions: data.interactions ?? 0 };
  } catch {
    return { ok: false, modelLoaded: false, memories: 0, interactions: 0 };
  }
}

export async function checkModelsStatus() {
  try {
    const res = await fetch(`${API_BASE_URL}/models/status`);
    if (!res.ok) throw new Error("bad response");
    return await res.json();
  } catch (err) {
    throw new SnowApiError(`Couldn't reach Snow's backend at ${API_BASE_URL}.`, err);
  }
}

export async function sendImage(imageUri, message = "What do you see?") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const formData = new FormData();
    formData.append("message", message);
    formData.append("image", { uri: imageUri, name: "photo.jpg", type: "image/jpeg" });
    const res = await fetch(`${API_BASE_URL}/chat/vision`, {
      method: "POST", body: formData, headers: { "Content-Type": "multipart/form-data" }, signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new SnowApiError(body.error || `Vision request failed (${res.status}).`);
    }
    const data = await res.json();
    return { response: data.response, intent: data.intent };
  } catch (err) {
    if (err instanceof SnowApiError) throw err;
    throw new SnowApiError(`Couldn't send image to Snow's backend.`, err);
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendFile(fileUri, fileName, message = "Teach me this") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const formData = new FormData();
    formData.append("message", message);
    formData.append("file", { uri: fileUri, name: fileName, type: "application/octet-stream" });
    const res = await fetch(`${API_BASE_URL}/chat/file`, {
      method: "POST", body: formData, headers: { "Content-Type": "multipart/form-data" }, signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new SnowApiError(body.error || `File request failed (${res.status}).`);
    }
    const data = await res.json();
    return { response: data.response, intent: data.intent };
  } catch (err) {
    if (err instanceof SnowApiError) throw err;
    throw new SnowApiError(`Couldn't send file to Snow's backend.`, err);
  } finally {
    clearTimeout(timeout);
  }
}

export async function forgetAllMemory() {
  const res = await fetch(`${API_BASE_URL}/memory/all`, { method: "DELETE" });
  if (!res.ok) throw new SnowApiError("Couldn't clear memory.");
  return await res.json();
}
