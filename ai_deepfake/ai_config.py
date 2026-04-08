"""
ai_config.py - Cấu hình tập trung cho AI Module
"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import Field

import torch

def _resolve_device() -> str:
    if os.environ.get("USE_GPU", "true").lower() != "true":
        return "cpu"
    return "cuda" if torch.cuda.is_available() else "cpu"

_default_model_dir = str(Path(__file__).parent / "models")

class AISettings(BaseSettings):
    model_config = {"extra": "ignore"}

    MODEL_DIR: Path = Field(default=Path(__file__).parent / "models")
    DEVICE: str = Field(default_factory=_resolve_device)
    
    DEFAULT_THRESHOLD: float = 0.50
    V1_WEIGHT: float = 0.4
    V2_WEIGHT: float = 0.6
    
    ENABLE_TTA: bool = True
    ENABLE_SIGNAL_ANALYSIS: bool = True

settings = AISettings()

if not settings.MODEL_DIR.exists():
    print(f"Warning: Model directory not found at {settings.MODEL_DIR}")