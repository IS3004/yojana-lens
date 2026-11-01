import json
import re
from typing import Any, Dict, Optional
from google import genai
from google.genai import types
from config import get_settings

settings = get_settings()

_client: Optional[genai.Client] = None


def get_genai_client() -> Optional[genai.Client]:
    """Retrieve or initialize the singleton Gemini client."""
    global _client
    if _client is None and settings.gemini_api_key:
        try:
            _client = genai.Client(api_key=settings.gemini_api_key)
        except Exception as e:
            print(f"[WARN] Failed to instantiate Gemini client: {e}")
            _client = None
    return _client


def clean_json_text(raw_text: str) -> str:
    """Strip markdown code fence backticks and whitespace from JSON response."""
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw_text.strip(), flags=re.MULTILINE)
    cleaned = re.sub(r"\s*```$", "", cleaned, flags=re.MULTILINE)
    return cleaned.strip()


async def generate_gemini_json(
    prompt: str,
    fallback_data: Dict[str, Any],
    model: str = "gemini-2.5-flash",
    temperature: float = 0.1,
    system_instruction: Optional[str] = None
) -> Dict[str, Any]:
    """
    Execute a structured JSON prompt against Gemini with error boundary and fallback.
    The LLM never makes calculations or eligibility choices; it strictly parses/structures.
    """
    client = get_genai_client()
    if not client:
        return fallback_data

    config = types.GenerateContentConfig(
        temperature=temperature,
        system_instruction=system_instruction,
        response_mime_type="application/json"
    )

    # Primary attempt with specified model, fallback to gemini-2.0-flash if 2.5 is unavailable
    models_to_try = [model, "gemini-2.0-flash"]
    for m in models_to_try:
        try:
            response = client.models.generate_content(
                model=m,
                contents=prompt,
                config=config
            )
            if response and response.text:
                cleaned = clean_json_text(response.text)
                return json.loads(cleaned)
        except Exception as err:
            print(f"[WARN] Gemini JSON call failed on model {m}: {err}")
            continue

    return fallback_data


async def analyze_multimodal_document(
    image_bytes: bytes,
    mime_type: str,
    prompt: str,
    fallback_data: Dict[str, Any],
    model: str = "gemini-2.5-flash"
) -> Dict[str, Any]:
    """
    Perform multimodal parsing on a document image (ration card, income certificate).
    Never return or store personal identity numbers (Aadhaar, ration card numbers).
    """
    client = get_genai_client()
    if not client:
        return fallback_data

    part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
    models_to_try = [model, "gemini-2.0-flash"]

    for m in models_to_try:
        try:
            response = client.models.generate_content(
                model=m,
                contents=[part, prompt],
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    response_mime_type="application/json"
                )
            )
            if response and response.text:
                cleaned = clean_json_text(response.text)
                return json.loads(cleaned)
        except Exception as err:
            print(f"[WARN] Multimodal analysis failed on model {m}: {err}")
            continue

    return fallback_data
