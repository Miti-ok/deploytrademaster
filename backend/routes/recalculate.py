from fastapi import APIRouter
from models.product import RecalculateRequest
from services.tariff_engine import TariffEngine
from services.risk_engine import RiskEngine
from services.map_flow_service import MapFlowService
from core import state

router = APIRouter(prefix="/recalculate", tags=["Recalculate"])


@router.post("/")
async def recalculate(request: RecalculateRequest):

    if request.analysis_id not in state.ANALYSIS_STORE:
        return {
            "success": False,
            "data": None,
            "error": {
                "code": "NOT_FOUND",
                "message": "Analysis ID not found."
            }
        }

    stored = state.ANALYSIS_STORE[request.analysis_id]

    # Use stored values unless overridden
    hs_code = request.hs_code or stored["hs_code"]
    materials = request.materials or stored["materials"]
    manufacturing_country = stored["manufacturing_country"]
    destination_country = request.destination_country or stored["destination_country"]
    declared_value = request.declared_value or stored["declared_value"]

    tariff_engine = TariffEngine()
    risk_engine = RiskEngine()
    map_service = MapFlowService()

    # -----------------------------
    # 1️⃣ Tariff Recalculation
    # -----------------------------
    tariff_result = tariff_engine.calculate_tariff(
        hs_code=hs_code,
        manufacturing_country=manufacturing_country,
        destination_country=destination_country,
        declared_value=declared_value
    )

    # -----------------------------
    # 2️⃣ Risk Recalculation
    # -----------------------------
    risk_score = risk_engine.calculate_risk(
        manufacturing_country=manufacturing_country,
        destination_country=destination_country,
        total_duty_percent=tariff_result.total_duty_percent,
        materials=materials
    )

    # -----------------------------
    # 3️⃣ Map Flow Regeneration
    # -----------------------------
    map_flow = map_service.generate_map_flow(
        manufacturing_country=manufacturing_country,
        destination_country=destination_country,
        materials=materials,
        hs_code=hs_code
    )

    return {
        "success": True,
        "data": {
            "hs_code": hs_code,
            "manufacturing_country": manufacturing_country,
            "destination_country": destination_country,
            "declared_value": declared_value,
            "materials": materials,
            "tariff_summary": tariff_result.dict(),
            "risk_score": risk_score,
            "map_flow": map_flow
        },
        "error": None
    }
