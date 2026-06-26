"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import AudioPlayer from "@/components/AudioPlayer";
import ChatPanel from "@/components/ChatPanel";
import TranscriptPanel from "@/components/TranscriptPanel";
import { useSessionSocket } from "@/hooks/useSessionSocket";
import { getAudioUrl, getSessionStatus, getTranscript } from "@/lib/api";
import type { TranscriptSegment } from "@/lib/types";

export default function ListenPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const status = await getSessionStatus(sessionId);
        if (cancelled) return;

        if (status.status !== "ready") {
          router.replace(`/preparing/${sessionId}`);
          return;
        }

        const transcript = await getTranscript(sessionId);
        if (cancelled) return;

        setSegments(transcript.segments);
        setReady(true);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to load session");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

  const {
    messages,
    connected,
    error: wsError,
    sendPlaybackPosition,
    sendUserMessage,
  } = useSessionSocket({ sessionId, enabled: ready });

  const handleTimeUpdate = useCallback(
    (time: number) => {
      setCurrentTime(time);
      sendPlaybackPosition(time);
    },
    [sendPlaybackPosition]
  );

  if (loading) {
    return (
      <main className="flex min-h-full items-center justify-center">
        <p className="text-muted">Loading your session…</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="flex min-h-full flex-col items-center justify-center gap-4 px-4">
        <p className="text-red-300">{loadError}</p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="text-sm text-accent underline-offset-2 hover:underline"
        >
          Back to home
        </button>
      </main>
    );
  }

  return (
    <main className="flex min-h-full flex-col">
      <header className="border-b border-border px-4 py-4 sm:px-6">
        <p className="text-xs uppercase tracking-widest text-accent">
          Listening together
        </p>
        <h1 className="text-lg font-medium">AI Podcast Companion</h1>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
        <AudioPlayer src={getAudioUrl(sessionId)} onTimeUpdate={handleTimeUpdate} />

        {(wsError || loadError) && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-2 text-sm text-red-300">
            {wsError || loadError}
          </div>
        )}

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          <div className="min-h-[320px] lg:min-h-0">
            <TranscriptPanel segments={segments} currentTime={currentTime} />
          </div>
          <div className="min-h-[320px] lg:min-h-0">
            <ChatPanel
              messages={messages}
              onSend={sendUserMessage}
              connected={connected}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
