from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://nexora:nexora_secret@localhost:5432/nexora_db"
    jwt_secret: str = "DEV_ONLY_REPLACE_IN_PRODUCTION"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30
    gemini_api_key: str = ""
    media_root: str = "./media_uploads"
    cors_origins: str = "*"

    class Config:
        env_file = ".env"

settings = Settings()
