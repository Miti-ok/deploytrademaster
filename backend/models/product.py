from typing import List, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from models.response_models import Material


class ProductRequest(BaseModel):
    product_name: str = Field(..., min_length=2)
    description: Optional[str] = None
    image_base64: Optional[str] = None
    image_mime_type: Optional[str] = None
    manufacturing_country: str = Field(..., min_length=2, max_length=2)
    destination_country: str = Field(..., min_length=2, max_length=2)
    declared_value: float = Field(..., gt=0)
    groq_api_key: Optional[str] = None

    @field_validator("description", mode="before")
    @classmethod
    def normalize_description(cls, value):
        if value is None:
            return None
        normalized = str(value).strip()
        return normalized or None

    @field_validator("image_mime_type", mode="before")
    @classmethod
    def normalize_image_mime_type(cls, value):
        if value is None:
            return None
        normalized = str(value).strip().lower()
        return normalized or None

    @field_validator("groq_api_key", mode="before")
    @classmethod
    def normalize_groq_api_key(cls, value):
        if value is None:
            return None
        normalized = str(value).strip()
        return normalized or None

    @field_validator("description")
    @classmethod
    def validate_description_length(cls, value):
        if value is None:
            return value
        if len(value) < 5:
            raise ValueError("Description must be at least 5 characters long")
        return value

    @field_validator("manufacturing_country", "destination_country")
    @classmethod
    def validate_country_code(cls, value):
        code = str(value).strip().upper()
        if len(code) != 2:
            raise ValueError("Country must be ISO2 format")
        return code

    @model_validator(mode="after")
    def validate_description_or_image(self):
        if not self.description and not self.image_base64:
            raise ValueError("Either description or image_base64 is required")
        return self


class RecalculateRequest(BaseModel):
    analysis_id: str
    destination_country: Optional[str] = None
    declared_value: Optional[float] = None
    hs_code: Optional[str] = None
    materials: Optional[List[Material]] = None
