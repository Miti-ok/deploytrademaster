import json
from typing import Any, Dict, List

from openai import OpenAI

from config import AI_MODEL, GROQ_API_KEY, GROQ_BASE_URL, USE_REAL_AI


class TradeIntelService:
    """
    Generates post-analysis intelligence blocks for the UI:
    - recent_insights
    - shipping_options
    - compliance_checks
    Falls back to deterministic values if AI output is unavailable.
    """

    def __init__(self):
        self.model = AI_MODEL
        self.client = None

        if USE_REAL_AI and GROQ_API_KEY:
            self.client = OpenAI(api_key=GROQ_API_KEY, base_url=GROQ_BASE_URL)

    def _resolve_client(self, groq_api_key: str = ""):
        if not USE_REAL_AI:
            return None
        key = str(groq_api_key or "").strip()
        if key:
            return OpenAI(api_key=key, base_url=GROQ_BASE_URL)
        return self.client

    @staticmethod
    def _risk_level(risk_score: float) -> str:
        if risk_score >= 70:
            return "High"
        if risk_score >= 40:
            return "Medium"
        return "Low"

    @staticmethod
    def _normalize_list(value: Any) -> List[Dict[str, Any]]:
        if isinstance(value, list):
            return [item for item in value if isinstance(item, dict)]
        return []

    def _fallback(
        self,
        product_name: str,
        hs_code: str,
        manufacturing_country: str,
        destination_country: str,
        declared_value: float,
        tariff_summary: Dict[str, Any],
        risk_score: float,
    ) -> Dict[str, List[Dict[str, Any]]]:
        risk_level = self._risk_level(risk_score)
        duty_percent = float(tariff_summary.get("total_duty_percent", 0) or 0)

        sea_cost = round(max(1200.0, declared_value * 0.06), 2)
        air_cost = round(max(3200.0, declared_value * 0.18), 2)
        rail_cost = round(max(1800.0, declared_value * 0.1), 2)

        return {
            "recent_insights": [
                {
                    "title": "Duty pressure signal",
                    "detail": (
                        f"AI expects tariff pressure near {duty_percent:.2f}% for HS {hs_code} "
                        f"on {manufacturing_country}->{destination_country}."
                    ),
                },
                {
                    "title": "Supply concentration",
                    "detail": "AI flags concentration risk when sourcing depends on a limited set of origin countries.",
                },
                {
                    "title": "Clearance planning",
                    "detail": (
                        "AI suggests pre-validating customs documents to avoid delay spikes "
                        "for medium/high risk lanes."
                    ),
                },
            ],
            "shipping_options": [
                {
                    "mode": "SEA",
                    "route": f"{manufacturing_country} -> {destination_country}",
                    "eta_days": 30,
                    "estimated_cost_usd": sea_cost,
                    "risk_level": "Low" if risk_level != "High" else "Medium",
                    "notes": "Best for bulk cargo and lower per-unit freight cost.",
                },
                {
                    "mode": "AIR",
                    "route": f"{manufacturing_country} -> {destination_country}",
                    "eta_days": 8,
                    "estimated_cost_usd": air_cost,
                    "risk_level": "Medium",
                    "notes": "Best for urgent shipments and high-value goods.",
                },
                {
                    "mode": "RAIL/INTERMODAL",
                    "route": f"{manufacturing_country} -> {destination_country}",
                    "eta_days": 18,
                    "estimated_cost_usd": rail_cost,
                    "risk_level": risk_level,
                    "notes": "Balanced transit time and cost when corridor access exists.",
                },
            ],
            "compliance_checks": [
                {
                    "item": "HS code and tariff basis recorded",
                    "status": "pass",
                    "note": f"Classification captured under HS {hs_code}.",
                },
                {
                    "item": "Country of origin declarations",
                    "status": "warn" if risk_score >= 55 else "pass",
                    "note": "Verify supplier-issued origin proof for all material stages.",
                },
                {
                    "item": "Shipment documentation package",
                    "status": "warn" if duty_percent >= 15 else "pass",
                    "note": "Commercial invoice, packing list, and transport bill should be pre-validated.",
                },
            ],
        }

    def _normalize_payload(self, parsed: Dict[str, Any], fallback: Dict[str, Any]) -> Dict[str, Any]:
        insights_raw = self._normalize_list(parsed.get("recent_insights"))
        shipping_raw = self._normalize_list(parsed.get("shipping_options"))
        compliance_raw = self._normalize_list(parsed.get("compliance_checks"))

        insights = []
        for item in insights_raw[:4]:
            title = str(item.get("title") or "Insight").strip()
            detail = str(item.get("detail") or "").strip()
            if detail:
                insights.append({"title": title, "detail": detail})

        shipping_options = []
        for item in shipping_raw[:4]:
            try:
                eta_days = int(float(item.get("eta_days", 0)))
            except (TypeError, ValueError):
                eta_days = 0
            try:
                estimated_cost = round(float(item.get("estimated_cost_usd", 0)), 2)
            except (TypeError, ValueError):
                estimated_cost = 0.0

            option = {
                "mode": str(item.get("mode") or "UNKNOWN").strip().upper(),
                "route": str(item.get("route") or "").strip(),
                "eta_days": max(1, eta_days) if eta_days else 1,
                "estimated_cost_usd": max(0.0, estimated_cost),
                "risk_level": str(item.get("risk_level") or "Medium").strip().title(),
                "notes": str(item.get("notes") or "").strip(),
            }
            shipping_options.append(option)

        compliance_checks = []
        for item in compliance_raw[:5]:
            status = str(item.get("status") or "warn").strip().lower()
            if status not in {"pass", "warn", "action_required"}:
                status = "warn"
            check = {
                "item": str(item.get("item") or "Compliance item").strip(),
                "status": status,
                "note": str(item.get("note") or "").strip(),
            }
            compliance_checks.append(check)

        return {
            "recent_insights": insights or fallback["recent_insights"],
            "shipping_options": shipping_options or fallback["shipping_options"],
            "compliance_checks": compliance_checks or fallback["compliance_checks"],
        }

    async def generate(
        self,
        product_name: str,
        hs_code: str,
        manufacturing_country: str,
        destination_country: str,
        declared_value: float,
        tariff_summary: Dict[str, Any],
        risk_score: float,
        ai_explanation: str,
        groq_api_key: str = "",
    ) -> Dict[str, List[Dict[str, Any]]]:
        fallback = self._fallback(
            product_name=product_name,
            hs_code=hs_code,
            manufacturing_country=manufacturing_country,
            destination_country=destination_country,
            declared_value=declared_value,
            tariff_summary=tariff_summary,
            risk_score=risk_score,
        )

        client = self._resolve_client(groq_api_key=groq_api_key)
        if client is None:
            return fallback

        prompt = f"""
You are a trade operations analyst.
Generate JSON only for UI cards.

Product: {product_name}
HS code: {hs_code}
Lane: {manufacturing_country} -> {destination_country}
Declared value USD: {declared_value}
Risk score: {risk_score}
Tariff summary: {json.dumps(tariff_summary)}
Existing AI classification note: {ai_explanation}

Return strict JSON:
{{
  "recent_insights": [
    {{"title": "string", "detail": "1-2 sentence market/compliance signal"}}
  ],
  "shipping_options": [
    {{
      "mode": "SEA|AIR|RAIL|ROAD|INTERMODAL",
      "route": "string",
      "eta_days": number,
      "estimated_cost_usd": number,
      "risk_level": "Low|Medium|High",
      "notes": "short practical note"
    }}
  ],
  "compliance_checks": [
    {{
      "item": "string",
      "status": "pass|warn|action_required",
      "note": "short actionable note"
    }}
  ]
}}

Rules:
- Return only valid JSON.
- Provide exactly 3 recent_insights.
- Provide exactly 3 shipping_options with realistic ETA and costs.
- Provide exactly 3 compliance_checks.
- Keep language concise and factual.
"""

        try:
            response = client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
            )

            content = (response.choices[0].message.content or "").strip()
            if content.startswith("```"):
                content = content.replace("```json", "").replace("```", "").strip()

            parsed = json.loads(content)
            if not isinstance(parsed, dict):
                return fallback

            return self._normalize_payload(parsed, fallback)
        except Exception:
            return fallback
