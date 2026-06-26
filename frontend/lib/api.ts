const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export function wsUrl(path: string): string {
  return `${WS_BASE}${path}`;
}

export interface SessionCreateResponse {
  session_id: string;
  audio_url: string;
}

export interface SessionStatusResponse {
  session_id: string;
  status: "pending" | "transcribing" | "ready" | "failed";
  segment_count: number;
  error: string | null;
}

export interface TranscriptResponse {
  session_id: string;
  segments: { start: number; end: number; text: string }[];
}

async function parseError(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => ({ detail: fallback }));
  const detail = body.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d: { msg?: string }) => d.msg).join(", ");
  }
  return fallback;
}

export async function createSession(file: File): Promise<SessionCreateResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(apiUrl("/api/sessions"), {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Upload failed"));
  }

  return response.json();
}

export async function createSampleSession(): Promise<SessionCreateResponse> {
  const response = await fetch(apiUrl("/api/sessions/sample"), {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Could not start sample session"));
  }

  return response.json();
}

export async function getSessionStatus(
  sessionId: string
): Promise<SessionStatusResponse> {
  const response = await fetch(apiUrl(`/api/sessions/${sessionId}/status`));

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to get session status"));
  }

  return response.json();
}

export async function getTranscript(
  sessionId: string
): Promise<TranscriptResponse> {
  const response = await fetch(apiUrl(`/api/sessions/${sessionId}/transcript`));

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to load transcript"));
  }

  return response.json();
}

export function getAudioUrl(sessionId: string): string {
  return apiUrl(`/api/sessions/${sessionId}/audio`);
}
