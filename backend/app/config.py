from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    whisper_model: str = "base"
    whisper_device: str = "cpu"
    cors_origins: str = "http://localhost:3000"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"
    uploads_dir: str = "uploads"
    max_upload_bytes: int = 50 * 1024 * 1024
    sample_audio_filename: str = "TheLastCreatureOnMars.mp3"

    @property
    def sample_audio_path(self) -> Path:
        return PROJECT_ROOT / "sample-audio" / self.sample_audio_filename

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
