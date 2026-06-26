from __future__ import annotations

import asyncio
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.models.schemas import ChatMessage
from app.services.companion import companion_agent
from app.services.session import session_store

router = APIRouter(tags=["websocket"])


async def _stream_ai_reply(
    session_id: str,
    *,
    user_message: str | None = None,
    proactive: bool = False,
) -> None:
    session = session_store.get(session_id)
    if not session or session.is_streaming:
        return

    session.is_streaming = True
    msg_id = str(uuid.uuid4())
    full_content = ""
    role = "proactive" if proactive else "reactive"

    try:
        heard = session.heard_segments()
        recent = session.recent_segments(5)

        async for token in companion_agent.stream_reply(
            heard_segments=heard,
            recent_segments=recent,
            chat_history=session.chat_history,
            user_message=user_message,
            proactive=proactive,
        ):
            full_content += token
            await session_store.broadcast(
                session,
                {
                    "type": "ai_token",
                    "content": token,
                    "id": msg_id,
                    "role": role,
                },
            )

        if full_content.strip():
            kind = "proactive" if proactive else "reactive"
            session.chat_history.append(
                ChatMessage(
                    id=msg_id,
                    role="assistant",
                    content=full_content.strip(),
                    kind=kind,
                )
            )
            if proactive:
                session.last_proactive_at = session.playback_position
                session.last_proactive_segment_count = len(session.heard_segments())
                session.proactive_count += 1

        await session_store.broadcast(
            session,
            {
                "type": "ai_message_end",
                "role": role,
                "id": msg_id,
            },
        )
    except Exception as exc:
        await session_store.broadcast(
            session,
            {"type": "error", "message": f"AI reply failed: {exc}"},
        )
    finally:
        session.is_streaming = False


async def _maybe_proactive_comment(session_id: str) -> None:
    session = session_store.get(session_id)
    if not session or not session.should_trigger_proactive():
        return

    asyncio.create_task(_stream_ai_reply(session_id, proactive=True))


@router.websocket("/ws/session/{session_id}")
async def session_websocket(websocket: WebSocket, session_id: str) -> None:
    session = session_store.get(session_id)
    if not session:
        await websocket.close(code=4004)
        return

    if session.transcription_status != "ready":
        await websocket.close(code=4003)
        return

    await websocket.accept()

    async def send_message(message: dict) -> None:
        await websocket.send_json(message)

    session.ws_subscribers.append(send_message)

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "playback_position":
                time_val = float(data.get("time", 0))
                session.playback_position = time_val
                await _maybe_proactive_comment(session_id)

            elif msg_type == "user_message":
                text = (data.get("text") or "").strip()
                if not text:
                    continue

                user_msg = ChatMessage(
                    id=str(uuid.uuid4()),
                    role="user",
                    content=text,
                    kind="reactive",
                )
                session.chat_history.append(user_msg)
                await session_store.broadcast(
                    session,
                    {"type": "user_message", "message": user_msg.model_dump()},
                )
                asyncio.create_task(
                    _stream_ai_reply(session_id, user_message=text),
                )

    except WebSocketDisconnect:
        pass
    finally:
        if send_message in session.ws_subscribers:
            session.ws_subscribers.remove(send_message)
