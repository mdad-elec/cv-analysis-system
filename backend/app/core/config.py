import os
from pydantic import Field
from pydantic_settings import BaseSettings
from typing import List, Optional

class Settings(BaseSettings):
    APP_ENV: str = "development"
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "CV Analysis System"
    
    ANTHROPIC_API_KEY: str
    
    MONGODB_URL: str
    MONGODB_NAME: str = "cv_analysis"
    MAX_CONNECTIONS_COUNT: int = 10
    MIN_CONNECTIONS_COUNT: int = 1
    CV_COLLECTION_NAME: str = "cv_documents"
    PARSED_DATA_COLLECTION_NAME: str = "parsed_cvs"
    
    REDIS_URL: str
    REDIS_HOST: str = "cv-analysis-redis"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""
    
    MAX_DOCUMENT_SIZE_MB: int = 10
    ALLOWED_DOCUMENT_TYPES: List[str] = ["pdf", "docx"]
    
    LOG_LEVEL: str = "INFO"
    ENABLE_TRACING: bool = False
    TRACE_EXPORTER: Optional[str] = None
    TRACE_EXPORTER_ENDPOINT: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()