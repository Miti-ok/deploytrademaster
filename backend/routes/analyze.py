from fastapi import APIRouter
import uuid

from models.product import ProductRequest
from services.ai_service import AIService
from services.tariff_engine import TariffEngine
from services.risk_engine import RiskEngine
from services.map_flow_service import MapFlowService
from services.trade_intel_service import TradeIntelService
from core import state


router = APIRouter(prefix="/analyze", tags=["Analyze"])

ai_service = AIService()
tariff_engine = TariffEngine()
risk_engine = RiskEngine()
map_service = MapFlowService()
trade_intel_service = TradeIntelService()


@router.post("/")
async def analyze_product(request: ProductRequest):

    try:
        ai_result = await ai_service.classify_product(
            product_name=request.product_name,
            description=request.description,
            image_base64=request.image_base64,
            image_mime_type=request.image_mime_type,
            groq_api_key=request.groq_api_key,
        )

        tariff_result = tariff_engine.calculate_tariff(
            hs_code=ai_result["hs_code"],
            manufacturing_country=request.manufacturing_country,
            destination_country=request.destination_country,
            declared_value=request.declared_value,
        )

        risk_score = risk_engine.calculate_risk(
            manufacturing_country=request.manufacturing_country,
            destination_country=request.destination_country,
            total_duty_percent=tariff_result.total_duty_percent,
            materials=ai_result["materials"],
        )

        map_flow = map_service.generate_map_flow(
            hs_code=ai_result["hs_code"],
            manufacturing_country=request.manufacturing_country,
            destination_country=request.destination_country,
            materials=ai_result["materials"],
        )
        map_service.save_globe_file(map_flow)

        tariff_summary = tariff_result.dict()
        trade_intel = await trade_intel_service.generate(
            product_name=request.product_name,
            hs_code=ai_result["hs_code"],
            manufacturing_country=request.manufacturing_country,
            destination_country=request.destination_country,
            declared_value=request.declared_value,
            tariff_summary=tariff_summary,
            risk_score=risk_score,
            ai_explanation=ai_result.get("explanation", ""),
            groq_api_key=request.groq_api_key,
        )

        analysis_id = str(uuid.uuid4())

        state.ANALYSIS_STORE[analysis_id] = {
            "hs_code": ai_result["hs_code"],
            "materials": ai_result["materials"],
            "manufacturing_country": request.manufacturing_country,
            "destination_country": request.destination_country,
            "declared_value": request.declared_value,
            "recent_insights": trade_intel["recent_insights"],
            "shipping_options": trade_intel["shipping_options"],
            "compliance_checks": trade_intel["compliance_checks"],
        }

        return {
            "success": True,
            "data": {
                "analysis_id": analysis_id,
                "hs_code": ai_result["hs_code"],
                "confidence": ai_result["confidence"],
                "explanation": ai_result["explanation"],
                "resolved_description": ai_result.get("resolved_description"),
                "manufacturing_country": request.manufacturing_country,
                "destination_country": request.destination_country,
                "declared_value": request.declared_value,
                "materials": ai_result["materials"],
                "tariff_summary": tariff_summary,
                "risk_score": risk_score,
                "map_flow": map_flow,
                "recent_insights": trade_intel["recent_insights"],
                "shipping_options": trade_intel["shipping_options"],
                "compliance_checks": trade_intel["compliance_checks"],
            },
            "error": None,
        }

    except Exception as e:
        return {
            "success": False,
            "data": None,
            "error": {"code": "INTERNAL_SERVER_ERROR", "message": str(e)},
        }
