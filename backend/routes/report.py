from fastapi import APIRouter
from pydantic import BaseModel

from core import state

router = APIRouter(prefix="/generate-report", tags=["Report"])


class ReportRequest(BaseModel):
    analysis_id: str


@router.post("/")
async def generate_report(request: ReportRequest):
    stored = state.ANALYSIS_STORE.get(request.analysis_id)

    if not stored:
        return {
            "success": False,
            "data": None,
            "error": {
                "code": "NOT_FOUND",
                "message": "Analysis ID not found."
            }
        }

    summary = (
        f"HS {stored['hs_code']} shipment from {stored['manufacturing_country']} "
        f"to {stored['destination_country']} with declared value ${stored['declared_value']:.2f}."
    )

    return {
        "success": True,
        "data": {
            "analysis_id": request.analysis_id,
            "hs_code": stored["hs_code"],
            "materials": stored["materials"],
            "summary": summary
        },
        "error": None
    }
