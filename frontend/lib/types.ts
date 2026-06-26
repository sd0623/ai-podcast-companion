export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  kind: "reactive" | "proactive";
  streaming?: boolean;
}

export type ServerMessage =
  | { type: "ai_token"; content: string; id: string; role?: "reactive" | "proactive" }
  | { type: "ai_message_end"; role: "reactive" | "proactive"; id: string }
  | { type: "user_message"; message: ChatMessage }
  | { type: "error"; message: string };
