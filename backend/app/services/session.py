from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass, field
from typing import Callable, Awaitable

from app.models.schemas import ChatMessage, TranscriptSegment


@dataclass
class Session:
    session_id: str
    audio_path: str
    audio_filename: str
    transcript: list[TranscriptSegment] = field(default_factory=list)
    chat_history: list[ChatMessage] = field(default_factory=list)
    transcription_status: str = "pending"  # pending | transcribing | ready | failed
    transcription_error: str | None = None
    transcription_complete: bool = False
    transcription_task: asyncio.Task | None = None
    playback_position: float = 0.0
    last_proactive_at: float = -999.0
    last_proactive_segment_count: int = 0
    proactive_count: int = 0
    is_streaming: bool = False
    ws_subscribers: list[Callable[[dict], Awaitable[None]]] = field(default_factory=list)

    def heard_segments(self) -> list[TranscriptSegment]:
        return [s for s in self.transcript if s.end <= self.playback_position]

    def recent_segments(self, count: int = 5) -> list[TranscriptSegment]:
        heard = self.heard_segments()
        return heard[-count:]

    def should_trigger_proactive(self) -> bool:
        if self.is_streaming:
            return False
        if self.playback_position < 30:
            return False
        if self.proactive_count >= 6:
            return False
        if self.playback_position - self.last_proactive_at < 90:
            return False
        heard_count = len(self.heard_segments())
        if heard_count <= self.last_proactive_segment_count:
            return False
        if not self.recent_segments(1):
            return False
        return True


class SessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, Session] = {}

    def create(
        self,
        audio_path: str,
        audio_filename: str,
        session_id: str | None = None,
    ) -> Session:
        sid = session_id or str(uuid.uuid4())
        session = Session(
            session_id=sid,
            audio_path=audio_path,
            audio_filename=audio_filename,
        )
        self._sessions[sid] = session
        return session

    def get(self, session_id: str) -> Session | None:
        return self._sessions.get(session_id)

    async def broadcast(self, session: Session, message: dict) -> None:
        dead: list[Callable[[dict], Awaitable[None]]] = []
        for subscriber in session.ws_subscribers:
            try:
                await subscriber(message)
            except Exception:
                dead.append(subscriber)
        for subscriber in dead:
            if subscriber in session.ws_subscribers:
                session.ws_subscribers.remove(subscriber)


session_store = SessionStore()
