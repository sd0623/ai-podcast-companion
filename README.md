# AI Podcast Companion

**Never listen alone.** A POC that lets you upload podcast audio, see a synced transcript, and listen with a thoughtful AI friend who chats back and occasionally chimes in on their own.

## Stack

- **Frontend:** Next.js, Tailwind CSS
- **Backend:** FastAPI, WebSockets
- **Transcription:** faster-whisper (local)
- **AI:** Ollama (local)

## Prerequisites

- Python 3.11+
- Node.js 20+
- [Ollama](https://ollama.com) installed and running locally

## Run Ollama locally

### 1. Install Ollama

Download and install from [ollama.com](https://ollama.com).

macOS (Homebrew alternative):

```bash
brew install ollama
```

### 2. Start the Ollama server

Ollama usually runs as a background app after install. To start it manually:

```bash
ollama serve
```

The API listens at **[http://localhost:11434](http://localhost:11434)**.

### 3. Pull a model

Download a model once in different terminal (pick one — smaller is faster on CPU):

```bash
# Recommended for POC (good balance of speed and quality)
ollama pull llama3.2

# Lighter / faster alternatives
ollama pull llama3.2:1b
ollama pull phi3
```

### 4. Verify it works

```bash
ollama list
ollama run llama3.2 "Hello, are you there?"
```

You should get a text reply. Press `Ctrl+D` to exit the chat shell.

### 5. Match model name in backend config

Set the same model name in `backend/.env`:

```
OLLAMA_MODEL=llama3.2
OLLAMA_BASE_URL=http://localhost:11434
```

If Ollama is running, you do **not** need to keep `ollama run llama3.2` open — the backend calls the API directly. The model must be pulled (`ollama pull`) first.

## Quick start

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env if you use a different Ollama model
uvicorn app.main:app --reload --port 8000
```

First transcription run downloads the Whisper `base` model (~150MB).

### 2. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 3. Run order

1. Start **Ollama** (app or `ollama serve`)
2. Start **backend** (`uvicorn app.main:app --reload --port 8000`)
3. Start **frontend** (`npm run dev`)

## Demo walkthrough

Use a **5–10 minute conversational clip** for the best experience.

1. **Upload** — Drop an MP3/WAV/M4A or click "Try a sample clip"
2. **Preparing** — Wait while Whisper transcribes (saved to `transcript.json`)
3. **Listen** — Press play; transcript highlights as audio plays
4. **Ask anytime** — Type a question mid-episode; Ollama replies with podcast context
5. **Proactive comments** — After ~90s of playback, the AI may chime in unprompted

### Success checklist

- Ollama responds to `ollama run llama3.2 "hi"`
- Preparing page finishes and redirects to listen
- Pausing and asking "What was their main point?" returns a contextual answer
- AI makes an unprompted comment within ~90s of continued playback

## Environment variables

### Backend (`backend/.env`)


| Variable          | Default                  | Description                           |
| ----------------- | ------------------------ | ------------------------------------- |
| `WHISPER_MODEL`   | `base`                   | Whisper model size                    |
| `WHISPER_DEVICE`  | `cpu`                    | `cpu` or `cuda`                       |
| `CORS_ORIGINS`    | `http://localhost:3000`  | Allowed frontend origins              |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API URL                        |
| `OLLAMA_MODEL`    | `llama3.2`               | Model name (must be pulled in Ollama) |


### Frontend (`frontend/.env.local`)


| Variable              | Default                 |
| --------------------- | ----------------------- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` |
| `NEXT_PUBLIC_WS_URL`  | `ws://localhost:8000`   |


## API overview


| Method | Path                            | Description                                              |
| ------ | ------------------------------- | -------------------------------------------------------- |
| `POST` | `/api/sessions`                 | Upload audio, create session                             |
| `POST` | `/api/sessions/sample`          | Create session from bundled sample MP3                   |
| `GET`  | `/api/sessions/{id}/status`     | Transcription status (pending/transcribing/ready/failed) |
| `GET`  | `/api/sessions/{id}/transcript` | Full transcript (when ready)                             |
| `GET`  | `/api/sessions/{id}/audio`      | Stream uploaded audio                                    |
| `WS`   | `/ws/session/{id}`              | Chat + proactive AI (listen page only)                   |


## Troubleshooting Ollama


| Problem                            | Fix                                                                  |
| ---------------------------------- | -------------------------------------------------------------------- |
| `Connection refused` on port 11434 | Start Ollama app or run `ollama serve`                               |
| `model not found`                  | Run `ollama pull llama3.2` (or your `OLLAMA_MODEL`)                  |
| Slow replies                       | Use a smaller model (`llama3.2:1b`, `phi3`)                          |
| Chat error in UI                   | Check backend terminal; confirm `OLLAMA_MODEL` matches `ollama list` |


## AI personality

The companion is prompted as a thoughtful friend: opinions, questions, challenges ideas, curious — never generic or lecture-y.

## Out of scope (POC)

- User auth / accounts
- Live mic or Spotify integration
- Persistent storage (sessions are in-memory)
- Production deployment

## Project structure

```
ai-podcast-companion/
├── backend/          # FastAPI + Whisper + Ollama
├── frontend/         # Next.js UI
├── sample-audio/     # Demo audio
└── docker-compose.yml
```

