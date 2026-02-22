from typing import Optional

from pydantic import BaseModel, Field, field_validator


class MaterialInput(BaseModel):
    id: Optional[str] = None
    name: str
    percentage: float = Field(..., gt=0)
    origin_country: str = Field(..., min_length=2, max_length=2)
    stage: str

    @field_validator("origin_country")
    @classmethod
    def validate_country_code(cls, value):
        code = str(value).strip().upper()
        if len(code) != 2:
            raise ValueError("Country must be ISO2 format")
        return code


class MaterialOutput(BaseModel):
    id: str
    name: str
    percentage: float
    origin_country: str
    stage: str
