from __future__ import annotations

import os
import shutil
import uuid
from pathlib import Path

import aiofiles
from fastapi import APIRouter, File, HTTPException, UploadFile

from app.config import settings
from app.models.schemas import (
    SessionCreateResponse,
    SessionStatusResponse,
    TranscriptResponse,
)
from app.services.session import session_store
from app.services.transcription_job import load_transcript_from_disk, start_transcription

router = APIRouter(prefix="/api", tags=["sessions"])

ALLOWED_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac", ".webm"}


def _session_response(session_id: str) -> SessionCreateResponse:
    return SessionCreateResponse(
        session_id=session_id,
        audio_url=f"/api/sessions/{session_id}/audio",
    )


@router.post("/sessions", response_model=SessionCreateResponse)
async def create_session(file: UploadFile = File(...)) -> SessionCreateResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    content = await file.read()
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(status_code=400, detail="File too large (max 50MB)")

    session_id = str(uuid.uuid4())
    session_dir = Path(settings.uploads_dir) / session_id
    session_dir.mkdir(parents=True, exist_ok=True)

    audio_filename = f"audio{ext}"
    audio_path = session_dir / audio_filename

    async with aiofiles.open(audio_path, "wb") as f:
        await f.write(content)

    session_store.create(str(audio_path), audio_filename, session_id=session_id)
    start_transcription(session_id)

    return _session_response(session_id)


@router.post("/sessions/sample", response_model=SessionCreateResponse)
async def create_sample_session() -> SessionCreateResponse:
    sample_path = settings.sample_audio_path
    if not sample_path.exists():
        raise HTTPException(status_code=404, detail="Sample audio file not found")

    session_id = str(uuid.uuid4())
    session_dir = Path(settings.uploads_dir) / session_id
    session_dir.mkdir(parents=True, exist_ok=True)

    audio_filename = "audio.mp3"
    audio_path = session_dir / audio_filename
    shutil.copy2(sample_path, audio_path)

    session_store.create(str(audio_path), audio_filename, session_id=session_id)
    start_transcription(session_id)

    return _session_response(session_id)


@router.get("/sessions/{session_id}/status", response_model=SessionStatusResponse)
async def get_session_status(session_id: str) -> SessionStatusResponse:
    session = session_store.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return SessionStatusResponse(
        session_id=session.session_id,
        status=session.transcription_status,  # type: ignore[arg-type]
        segment_count=len(session.transcript),
        error=session.transcription_error,
    )


@router.get("/sessions/{session_id}/transcript", response_model=TranscriptResponse)
async def get_session_transcript(session_id: str) -> TranscriptResponse:
    session = session_store.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.transcription_status != "ready":
        raise HTTPException(status_code=409, detail="Transcription not ready yet")

    segments = session.transcript
    if not segments:
        segments = load_transcript_from_disk(session_id, session.audio_path)
        session.transcript = segments

    return TranscriptResponse(session_id=session_id, segments=segments)


@router.get("/sessions/{session_id}/audio")
async def get_session_audio(session_id: str):
    from fastapi.responses import FileResponse

    session = session_store.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if not os.path.exists(session.audio_path):
        raise HTTPException(status_code=404, detail="Audio file not found")

    return FileResponse(
        session.audio_path,
        media_type="audio/mpeg",
        filename=session.audio_filename,
    )


@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    session = session_store.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "session_id": session.session_id,
        "audio_url": f"/api/sessions/{session_id}/audio",
        "status": session.transcription_status,
        "transcription_complete": session.transcription_complete,
        "segment_count": len(session.transcript),
    }
