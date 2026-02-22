import json
from pathlib import Path
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from core import state
from routes.analyze import router as analyze_router
from routes.recalculate import router as recalc_router
from routes.report import router as report_router


app = FastAPI(
    title="AI Global Trade Intelligence Backend",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(analyze_router)
app.include_router(recalc_router)
app.include_router(report_router)

DATA_DIR = BASE_DIR / "data"


def load_json_file(filename):
    with (DATA_DIR / filename).open("r", encoding="utf-8") as f:
        return json.load(f)


@app.on_event("startup")
async def startup_event():
    state.TARIFFS.clear()
    state.TRADE_AGREEMENTS.clear()
    state.COUNTRY_RISK.clear()

    state.TARIFFS.update(load_json_file("tariffs.json"))
    state.TRADE_AGREEMENTS.update(load_json_file("trade_agreements.json"))
    state.COUNTRY_RISK.update(load_json_file("country_risk.json"))

    print("[OK] Static data loaded successfully")
    print(f"[DATA] Tariffs: {len(state.TARIFFS)} entries")
    print(f"[DATA] Country Risks: {len(state.COUNTRY_RISK)} entries")


@app.get("/")
def root():
    return {
        "success": True,
        "data": {
            "message": "AI Global Trade Intelligence Backend Running",
            "version": "1.0.0"
        },
        "error": None
    }
