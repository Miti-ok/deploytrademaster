import json
from pathlib import Path
from typing import Optional
from openai import OpenAI
from dotenv import load_dotenv
from config import (
    GROQ_API_KEY,
    GROQ_BASE_URL,
    AI_MODEL,
    VISION_MODEL,
    VISION_FALLBACK_MODEL,
    USE_REAL_AI
)

load_dotenv()

class AIService:
    _ALLOWED_IMAGE_MIME_TYPES = {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif"
    }

    def __init__(self):
        self.client = None
        if USE_REAL_AI and GROQ_API_KEY:
            self.client = OpenAI(
                api_key=GROQ_API_KEY,
                base_url=GROQ_BASE_URL
            )
        self.model = AI_MODEL
        self.vision_model = VISION_MODEL
        self.vision_fallback_model = VISION_FALLBACK_MODEL
        self.supported_hs_codes = self._load_supported_hs_codes()

    def _resolve_client(self, groq_api_key: Optional[str] = None):
        if not USE_REAL_AI:
            return None
        key = str(groq_api_key or "").strip()
        if key:
            return OpenAI(api_key=key, base_url=GROQ_BASE_URL)
        if self.client is not None:
            return self.client
        raise RuntimeError(
            "Groq API key missing. Provide groq_api_key in the request or set GROQ_API_KEY in backend/.env."
        )

    def _load_supported_hs_codes(self):
        data_path = Path(__file__).resolve().parent.parent / "data" / "tariffs.json"
        try:
            with data_path.open("r", encoding="utf-8") as f:
                data = json.load(f)
            return sorted(data.keys())
        except Exception:
            return []

    def _normalize_image_mime_type(self, image_mime_type: Optional[str]) -> str:
        normalized = (image_mime_type or "").strip().lower()
        if normalized in self._ALLOWED_IMAGE_MIME_TYPES:
            return normalized
        return "image/jpeg"

    def _normalize_hs_code(self, hs_code_value) -> str:
        raw = str(hs_code_value or "").strip()
        digits = "".join(ch for ch in raw if ch.isdigit())

        if len(digits) >= 6:
            return f"{digits[:4]}.{digits[4:6]}"
        if len(digits) >= 4:
            return digits[:4]
        if raw:
            return raw
        if self.supported_hs_codes:
            return self.supported_hs_codes[0]
        return "0000.00"

    @staticmethod
    def _normalize_country_code(value, fallback: str = "US") -> str:
        code = str(value or "").strip().upper()
        return code if len(code) == 2 and code.isalpha() else fallback

    def _normalize_materials(self, materials_value, product_name: str):
        if isinstance(materials_value, list):
            raw_materials = materials_value
        elif isinstance(materials_value, dict):
            has_material_fields = any(key in materials_value for key in ("name", "material", "percentage"))
            raw_materials = [materials_value] if has_material_fields else [
                value for value in materials_value.values() if isinstance(value, dict)
            ]
        else:
            raw_materials = []

        normalized = []
        for idx, item in enumerate(raw_materials):
            if not isinstance(item, dict):
                continue

            try:
                percentage = float(item.get("percentage", 0))
            except (TypeError, ValueError):
                percentage = 0.0

            normalized.append(
                {
                    "id": str(item.get("id") or f"mat-{idx + 1}"),
                    "name": str(item.get("name") or item.get("material") or f"{product_name} material").strip(),
                    "percentage": max(0.0, percentage),
                    "origin_country": self._normalize_country_code(item.get("origin_country") or item.get("country")),
                    "stage": str(item.get("stage") or "raw_material").strip() or "raw_material"
                }
            )

        if not normalized:
            normalized = [
                {
                    "id": "mat-1",
                    "name": f"{product_name} material",
                    "percentage": 100.0,
                    "origin_country": "US",
                    "stage": "raw_material"
                }
            ]
            return normalized

        total = sum(item["percentage"] for item in normalized)
        if total <= 0:
            equal = round(100.0 / len(normalized), 2)
            for item in normalized:
                item["percentage"] = equal
        else:
            running_total = 0.0
            for idx, item in enumerate(normalized):
                if idx == len(normalized) - 1:
                    item["percentage"] = round(max(0.0, 100.0 - running_total), 2)
                else:
                    scaled = round((item["percentage"] / total) * 100.0, 2)
                    item["percentage"] = scaled
                    running_total += scaled

        return normalized

    def _normalize_ai_result(self, parsed: dict, product_name: str) -> dict:
        if not isinstance(parsed, dict):
            parsed = {}

        try:
            confidence = float(parsed.get("confidence", 0.75))
        except (TypeError, ValueError):
            confidence = 0.75

        if confidence > 1:
            confidence = confidence / 100 if confidence <= 100 else 1.0
        confidence = max(0.0, min(1.0, confidence))

        explanation = str(parsed.get("explanation") or "AI classification generated.").strip()

        return {
            "hs_code": self._normalize_hs_code(parsed.get("hs_code")),
            "confidence": confidence,
            "explanation": explanation,
            "materials": self._normalize_materials(parsed.get("materials"), product_name)
        }

    async def describe_product_image(
        self,
        product_name: str,
        image_base64: str,
        image_mime_type: Optional[str] = None,
        groq_api_key: Optional[str] = None
    ) -> str:
        """
        Uses a vision-capable model to generate a trade-focused description from an image.
        """
        client = self._resolve_client(groq_api_key=groq_api_key)
        if client is None:
            raise RuntimeError("AI client is not configured.")

        if not image_base64:
            raise ValueError("Image data is required for image description.")

        mime_type = self._normalize_image_mime_type(image_mime_type)

        prompt = (
            "Describe this product for customs classification. "
            "Return one concise paragraph including visible materials, intended use, "
            "construction details, and notable components."
        )

        models_to_try = [
            model for model in [self.vision_model, self.vision_fallback_model]
            if model
        ]

        response = None
        last_error = None
        for model_name in models_to_try:
            try:
                response = client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": f"Product name hint: {product_name}\n{prompt}"},
                                {
                                    "type": "image_url",
                                    "image_url": {"url": f"data:{mime_type};base64,{image_base64}"}
                                }
                            ]
                        }
                    ],
                    temperature=0
                )
                break
            except Exception as err:
                body = getattr(err, "body", None)
                error_code = None
                if isinstance(body, dict):
                    error_code = (body.get("error") or {}).get("code")
                message = str(err).lower()
                if error_code in {"model_decommissioned", "model_not_found"} or "decommissioned" in message:
                    last_error = err
                    continue
                raise

        if response is None:
            raise RuntimeError(
                f"No working vision model available. Tried: {models_to_try}. Last error: {last_error}"
            )

        description = (response.choices[0].message.content or "").strip()
        if not description:
            raise ValueError("Vision model did not return a usable description.")

        return description

    async def classify_product(
        self,
        product_name: str,
        description: Optional[str] = None,
        image_base64: Optional[str] = None,
        image_mime_type: Optional[str] = None,
        groq_api_key: Optional[str] = None
    ):
        """
        Calls LLM to classify product into HS code,
        extract materials, and provide explanation.
        """
        client = self._resolve_client(groq_api_key=groq_api_key)
        if client is None:
            raise RuntimeError("AI client is not configured.")

        resolved_description = description.strip() if description else ""

        if not resolved_description:
            if not image_base64:
                raise ValueError("Either description or image is required for classification.")
            resolved_description = await self.describe_product_image(
                product_name,
                image_base64,
                image_mime_type=image_mime_type,
                groq_api_key=groq_api_key
            )

        hs_code_guidance = ", ".join(self.supported_hs_codes) if self.supported_hs_codes else "Any valid HS code"

        prompt = f"""
You are a global trade classification expert.

Classify the product below and return STRICTLY valid JSON.

Product Name: {product_name}
Description: {resolved_description}
Supported HS codes for this system: {hs_code_guidance}

Return format:
{{
    "hs_code": "string",
    "confidence": float,
    "explanation": "short reasoning",
    "materials": [
        {{
            "id": "unique-id",
            "name": "material name",
            "percentage": float,
            "origin_country": "ISO2 country code",
            "stage": "raw_material"
        }}
    ]
}}

Important:
- Return ONLY JSON.
- No markdown.
- No backticks.
- No extra commentary.
- Ensure percentages sum to 100.
- Choose an hs_code from the supported list when possible.
"""

        response = client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0  # deterministic
        )

        content = response.choices[0].message.content.strip()

        # 🔒 Safety: remove accidental markdown wrapping
        if content.startswith("```"):
            content = content.replace("```json", "").replace("```", "").strip()

        try:
            parsed = json.loads(content)
        except json.JSONDecodeError:
            raise ValueError("AI returned invalid JSON format.")

        normalized = self._normalize_ai_result(parsed, product_name)
        normalized["resolved_description"] = resolved_description
        return normalized
