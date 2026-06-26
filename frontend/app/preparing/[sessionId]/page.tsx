"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getSessionStatus } from "@/lib/api";

export default function PreparingPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [status, setStatus] = useState<"pending" | "transcribing" | "ready" | "failed">(
    "pending"
  );
  const [segmentCount, setSegmentCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const data = await getSessionStatus(sessionId);
        if (cancelled) return;

        setStatus(data.status);
        setSegmentCount(data.segment_count);

        if (data.status === "ready") {
          router.replace(`/listen/${sessionId}`);
          return;
        }

        if (data.status === "failed") {
          setError(data.error || "Transcription failed");
          return;
        }

        timer = setTimeout(poll, 2000);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to check status");
        }
      }
    };

    void poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId, router]);

  const statusLabel =
    status === "pending"
      ? "Getting ready…"
      : status === "transcribing"
        ? "Transcribing your podcast…"
        : status === "failed"
          ? "Something went wrong"
          : "Ready!";

  return (
    <main className="flex min-h-full flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <p className="mb-2 text-sm uppercase tracking-widest text-accent">
          Never listen alone
        </p>
        <h1 className="mb-3 text-2xl font-semibold">{statusLabel}</h1>

        {status !== "failed" && (
          <>
            <div className="mx-auto mb-6 h-10 w-10 animate-spin rounded-full border-2 border-border border-t-accent" />
            <p className="text-sm text-muted">
              Whisper is processing the audio. This may take a few minutes on CPU.
            </p>
            {segmentCount > 0 && (
              <p className="mt-2 text-xs text-muted">
                {segmentCount} segment{segmentCount === 1 ? "" : "s"} transcribed so far
              </p>
            )}
          </>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {error}
            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-3 block w-full text-accent underline-offset-2 hover:underline"
            >
              Back to home
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
