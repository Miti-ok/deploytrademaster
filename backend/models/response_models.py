from typing import Dict, List, Optional

from pydantic import BaseModel


class Material(BaseModel):
    id: str
    name: str
    percentage: float
    origin_country: str
    stage: str


class AIAnalysisResponse(BaseModel):
    hs_code: str
    confidence: float
    explanation: str
    materials: List[Material]


class TariffResponse(BaseModel):
    base_duty: float
    additional_duty: float
    trade_agreement_discount: float
    total_duty_percent: float
    estimated_duty_amount: float
    explanation: str


class InsightItem(BaseModel):
    title: str
    detail: str


class ShippingOption(BaseModel):
    mode: str
    route: str
    eta_days: int
    estimated_cost_usd: float
    risk_level: str
    notes: str


class ComplianceCheck(BaseModel):
    item: str
    status: str
    note: str


class AnalyzeResponseData(BaseModel):
    analysis_id: str
    hs_code: str
    confidence: float
    explanation: str
    materials: List[Material]
    tariff_summary: TariffResponse
    risk_score: float
    map_flow: Dict
    recent_insights: List[InsightItem]
    shipping_options: List[ShippingOption]
    compliance_checks: List[ComplianceCheck]


class APIResponse(BaseModel):
    success: bool
    data: Optional[Dict]
    error: Optional[Dict]
