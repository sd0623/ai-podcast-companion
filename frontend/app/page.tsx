"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { createSampleSession, createSession } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const goToPreparing = useCallback(
    (sessionId: string) => {
      router.push(`/preparing/${sessionId}`);
    },
    [router]
  );

  const handleFile = useCallback(
    async (file: File) => {
      setUploading(true);
      setError(null);
      try {
        const session = await createSession(file);
        goToPreparing(session.session_id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
        setUploading(false);
      }
    },
    [goToPreparing]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) void handleFile(file);
    },
    [handleFile]
  );

  const trySample = async () => {
    setUploading(true);
    setError(null);
    try {
      const session = await createSampleSession();
      goToPreparing(session.session_id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load sample audio."
      );
      setUploading(false);
    }
  };

  return (
    <main className="flex min-h-full flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg text-center">
        <p className="mb-2 text-sm uppercase tracking-widest text-accent">
          Never listen alone
        </p>
        <h1 className="mb-3 text-3xl font-semibold tracking-tight">
          AI Podcast Companion
        </h1>
        <p className="mb-10 text-muted">
          Upload a podcast clip and listen with a thoughtful AI friend who asks
          questions, shares opinions, and listens along.
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`rounded-2xl border-2 border-dashed p-10 transition ${
            dragOver
              ? "border-accent bg-accent/5"
              : "border-border bg-surface"
          }`}
        >
          <label className="cursor-pointer">
            <input
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-elevated text-2xl">
                🎧
              </div>
              <p className="font-medium">
                {uploading
                  ? "Starting your session…"
                  : "Drop audio here or click to upload"}
              </p>
              <p className="text-xs text-muted">MP3, WAV, M4A — up to 50MB</p>
            </div>
          </label>
        </div>

        <button
          type="button"
          onClick={() => void trySample()}
          disabled={uploading}
          className="mt-4 text-sm text-accent underline-offset-2 hover:underline disabled:opacity-40"
        >
          Or try a sample clip
        </button>

        {error && (
          <p className="mt-4 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
