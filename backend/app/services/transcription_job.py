from __future__ import annotations

import json
from pathlib import Path

from app.models.schemas import TranscriptSegment
from app.services.session import session_store
from app.services.transcription import transcribe_audio


def transcript_path_for(session_id: str, audio_path: str) -> Path:
    return Path(audio_path).parent / "transcript.json"


async def run_transcription(session_id: str) -> None:
    session = session_store.get(session_id)
    if not session:
        return
    if session.transcription_status == "ready":
        return

    session.transcription_status = "transcribing"
    session.transcription_error = None

    try:
        async for segment in transcribe_audio(session.audio_path):
            session.transcript.append(segment)

        out_path = transcript_path_for(session_id, session.audio_path)
        out_path.write_text(
            json.dumps([s.model_dump() for s in session.transcript], indent=2),
            encoding="utf-8",
        )

        session.transcription_complete = True
        session.transcription_status = "ready"
    except Exception as exc:
        session.transcription_status = "failed"
        session.transcription_error = str(exc)


def load_transcript_from_disk(session_id: str, audio_path: str) -> list[TranscriptSegment]:
    path = transcript_path_for(session_id, audio_path)
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    return [TranscriptSegment.model_validate(item) for item in data]


def start_transcription(session_id: str) -> None:
    import asyncio

    session = session_store.get(session_id)
    if not session:
        return
    if session.transcription_status == "ready":
        return
    if session.transcription_task is not None and not session.transcription_task.done():
        return

    session.transcription_task = asyncio.create_task(run_transcription(session_id))
