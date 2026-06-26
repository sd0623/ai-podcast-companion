from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel


class TranscriptSegment(BaseModel):
    start: float
    end: float
    text: str


class SessionCreateResponse(BaseModel):
    session_id: str
    audio_url: str


class SessionStatusResponse(BaseModel):
    session_id: str
    status: Literal["pending", "transcribing", "ready", "failed"]
    segment_count: int
    error: Optional[str] = None


class TranscriptResponse(BaseModel):
    session_id: str
    segments: list[TranscriptSegment]


class ChatMessage(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    content: str
    kind: Literal["reactive", "proactive"] = "reactive"
