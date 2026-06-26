"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { wsUrl } from "@/lib/api";
import type { ChatMessage, ServerMessage } from "@/lib/types";

interface UseSessionSocketOptions {
  sessionId: string;
  enabled?: boolean;
}

export function useSessionSocket({
  sessionId,
  enabled = true,
}: UseSessionSocketOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const streamingRef = useRef<Map<string, string>>(new Map());

  const handleMessage = useCallback((data: ServerMessage) => {
    switch (data.type) {
      case "user_message":
        setMessages((prev) => [...prev, data.message]);
        break;

      case "ai_token": {
        const current = streamingRef.current.get(data.id) || "";
        const updated = current + data.content;
        streamingRef.current.set(data.id, updated);

        setMessages((prev) => {
          const existing = prev.find((m) => m.id === data.id);
          if (existing) {
            return prev.map((m) =>
              m.id === data.id ? { ...m, content: updated, streaming: true } : m
            );
          }
          return [
            ...prev,
            {
              id: data.id,
              role: "assistant" as const,
              content: updated,
              kind: data.role ?? "reactive",
              streaming: true,
            },
          ];
        });
        break;
      }

      case "ai_message_end":
        streamingRef.current.delete(data.id);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.id
              ? { ...m, kind: data.role, streaming: false }
              : m
          )
        );
        break;

      case "error":
        setError(data.message);
        break;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const connect = () => {
      if (closed) return;

      const ws = new WebSocket(wsUrl(`/ws/session/${sessionId}`));
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ServerMessage;
          handleMessage(data);
        } catch {
          setError("Failed to parse server message");
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (!closed) {
          reconnectTimer = setTimeout(connect, 2000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [sessionId, enabled, handleMessage]);

  const sendPlaybackPosition = useCallback((time: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "playback_position", time }));
    }
  }, []);

  const sendUserMessage = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "user_message", text }));
    }
  }, []);

  return {
    messages,
    connected,
    error,
    sendPlaybackPosition,
    sendUserMessage,
  };
}
