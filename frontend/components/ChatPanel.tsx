"use client";

import { useEffect, useRef, useState } from "react";

import type { ChatMessage } from "@/lib/types";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  connected: boolean;
  onFocusInput?: () => void;
}

export default function ChatPanel({
  messages,
  onSend,
  connected,
  onFocusInput,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput("");
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">Your companion</h2>
          <span
            className={`text-xs ${connected ? "text-accent" : "text-muted"}`}
          >
            {connected ? "Listening with you" : "Reconnecting…"}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted">
          Ask anything or share your thoughts — they&apos;ll chime in too.
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted">
            Your AI friend is here. They might comment as the episode goes on.
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-accent text-background"
                    : "bg-surface-elevated text-foreground"
                }`}
              >
                {msg.role === "assistant" && msg.kind === "proactive" && (
                  <span className="mb-1 block text-[10px] uppercase tracking-wide text-accent">
                    chimed in
                  </span>
                )}
                {msg.content}
                {msg.streaming && (
                  <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-accent" />
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-border p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={onFocusInput}
            placeholder="What do you think so far?"
            className="flex-1 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || !connected}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background transition hover:bg-accent-dim disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
