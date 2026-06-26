from __future__ import annotations

import json
from collections.abc import AsyncIterator

import httpx

from app.config import settings
from app.models.schemas import ChatMessage, TranscriptSegment

SYSTEM_PROMPT = """You're a thoughtful friend listening to a podcast together with the user.
You have opinions. You ask questions. You challenge ideas. You are curious.
Keep replies short (2-4 sentences) unless the user asks for depth.
Reference what was just said in the podcast when relevant.
Never lecture. Never say "As an AI". Speak like a real friend."""

PROACTIVE_PROMPT = """The podcast just covered:
{recent_text}

Share one brief spontaneous reaction — a question, opinion, or curiosity.
Do not summarize. Do not greet. Just react like a friend would mid-episode."""


def _format_segments(segments: list[TranscriptSegment]) -> str:
    if not segments:
        return "(No transcript yet)"
    return "\n".join(f"[{s.start:.0f}s] {s.text}" for s in segments)


def _build_messages(
    heard_segments: list[TranscriptSegment],
    recent_segments: list[TranscriptSegment],
    chat_history: list[ChatMessage],
    user_message: str | None = None,
    proactive: bool = False,
) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]

    context_parts = [
        "Podcast transcript heard so far:",
        _format_segments(heard_segments[-20:]),
    ]
    if recent_segments:
        context_parts.append("\nMost recent lines:")
        context_parts.append(_format_segments(recent_segments))

    messages.append({"role": "user", "content": "\n".join(context_parts)})
    messages.append(
        {
            "role": "assistant",
            "content": "Got it, I'm listening along with you.",
        }
    )

    for msg in chat_history[-10:]:
        role = "user" if msg.role == "user" else "assistant"
        messages.append({"role": role, "content": msg.content})

    if proactive:
        messages.append(
            {
                "role": "user",
                "content": PROACTIVE_PROMPT.format(
                    recent_text=_format_segments(recent_segments)
                ),
            }
        )
    elif user_message:
        messages.append({"role": "user", "content": user_message})

    return messages


class CompanionAgent:
    async def stream_reply(
        self,
        heard_segments: list[TranscriptSegment],
        recent_segments: list[TranscriptSegment],
        chat_history: list[ChatMessage],
        user_message: str | None = None,
        proactive: bool = False,
    ) -> AsyncIterator[str]:
        messages = _build_messages(
            heard_segments=heard_segments,
            recent_segments=recent_segments,
            chat_history=chat_history,
            user_message=user_message,
            proactive=proactive,
        )

        async for token in self._stream_ollama(messages):
            yield token

    async def _stream_ollama(self, messages: list[dict[str, str]]) -> AsyncIterator[str]:
        payload = {
            "model": settings.ollama_model,
            "messages": messages,
            "stream": True,
        }
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{settings.ollama_base_url}/api/chat",
                json=payload,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    data = json.loads(line)
                    content = data.get("message", {}).get("content", "")
                    if content:
                        yield content


companion_agent = CompanionAgent()
