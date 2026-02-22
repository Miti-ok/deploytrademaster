import os
from dotenv import load_dotenv
from pathlib import Path

# Load .env explicitly
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_BASE_URL = "https://api.groq.com/openai/v1"
AI_MODEL = os.getenv("AI_MODEL", "llama-3.3-70b-versatile")

_DEPRECATED_MODEL_REPLACEMENTS = {
    "llama-3.2-11b-vision-preview": "meta-llama/llama-4-scout-17b-16e-instruct",
    "llama-3.2-90b-vision-preview": "meta-llama/llama-4-scout-17b-16e-instruct",
}
_raw_vision_model = os.getenv("VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")
VISION_MODEL = _DEPRECATED_MODEL_REPLACEMENTS.get(_raw_vision_model, _raw_vision_model)
VISION_FALLBACK_MODEL = os.getenv(
    "VISION_FALLBACK_MODEL",
    "meta-llama/llama-4-maverick-17b-128e-instruct"
)
USE_REAL_AI = True
