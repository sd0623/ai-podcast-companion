from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator

from faster_whisper import WhisperModel

from app.config import settings
from app.models.schemas import TranscriptSegment

_model: WhisperModel | None = None


def get_whisper_model() -> WhisperModel:
    global _model
    if _model is None:
        compute_type = "int8" if settings.whisper_device == "cpu" else "float16"
        _model = WhisperModel(
            settings.whisper_model,
            device=settings.whisper_device,
            compute_type=compute_type,
        )
    return _model


async def transcribe_audio(audio_path: str) -> AsyncIterator[TranscriptSegment]:
    queue: asyncio.Queue[TranscriptSegment | None] = asyncio.Queue()

    def _transcribe() -> None:
        model = get_whisper_model()
        segments, _ = model.transcribe(audio_path, beam_size=5, vad_filter=True)
        for segment in segments:
            queue.put_nowait(
                TranscriptSegment(
                    start=segment.start,
                    end=segment.end,
                    text=segment.text.strip(),
                )
            )
        queue.put_nowait(None)

    loop = asyncio.get_running_loop()
    loop.run_in_executor(None, _transcribe)

    while True:
        item = await queue.get()
        if item is None:
            break
        yield item
