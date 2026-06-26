"use client";

import { useEffect, useRef, useState } from "react";

import type { TranscriptSegment } from "@/lib/types";

interface TranscriptPanelProps {
  segments: TranscriptSegment[];
  currentTime: number;
}

export default function TranscriptPanel({
  segments,
  currentTime,
}: TranscriptPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLParagraphElement>(null);
  const [userScrolled, setUserScrolled] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onScroll = () => {
      const atBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 80;
      setUserScrolled(!atBottom);
    };

    container.addEventListener("scroll", onScroll);
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!userScrolled && activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentTime, userScrolled]);

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium text-foreground">Transcript</h2>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-3">
        {segments.length === 0 ? (
          <p className="text-sm text-muted">No transcript available.</p>
        ) : (
          <div className="space-y-3">
            {segments.map((segment, i) => {
              const isActive =
                currentTime >= segment.start && currentTime < segment.end;
              const isPast = currentTime >= segment.end;

              return (
                <p
                  key={`${segment.start}-${i}`}
                  ref={isActive ? activeRef : undefined}
                  className={`text-sm leading-relaxed transition-colors ${
                    isActive
                      ? "rounded-lg bg-accent/15 px-2 py-1 text-accent"
                      : isPast
                        ? "text-muted"
                        : "text-foreground/70"
                  }`}
                >
                  <span className="mr-2 font-mono text-xs opacity-60">
                    {Math.floor(segment.start / 60)}:
                    {Math.floor(segment.start % 60)
                      .toString()
                      .padStart(2, "0")}
                  </span>
                  {segment.text}
                </p>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
