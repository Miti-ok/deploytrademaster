import json
from pathlib import Path
from typing import Dict, List


class MapFlowService:

    def __init__(self):
        self.output_file = Path(__file__).resolve().parent.parent / "globe_data.json"

        self.country_map = {
            "US": "United States of America",
            "IN": "India",
            "CN": "China",
            "DE": "Germany",
            "JP": "Japan",
            "KR": "South Korea",
            "FR": "France",
            "GB": "United Kingdom",
            "IT": "Italy",
            "CA": "Canada",
            "BR": "Brazil",
            "AU": "Australia"
        }

    def resolve_country(self, code: str) -> str:
        return self.country_map.get(code.upper(), code)

    def generate_map_flow(
        self,
        hs_code: str,
        manufacturing_country: str,
        destination_country: str,
        materials: List[Dict]
    ) -> List[Dict]:
        material_name = "Unknown"
        if materials:
            first = materials[0]
            if isinstance(first, dict):
                material_name = first.get("name") or "Unknown"
            else:
                material_name = getattr(first, "name", "Unknown")

        return [
            {
                "country": self.resolve_country(manufacturing_country),
                "role": "exporter",
                "material": material_name,
                "hs_code": hs_code
            },
            {
                "country": self.resolve_country(destination_country),
                "role": "importer",
                "material": material_name,
                "hs_code": hs_code
            }
        ]

    def save_globe_file(self, flow_data: List[Dict]):
        with self.output_file.open("w", encoding="utf-8") as f:
            json.dump(flow_data, f, indent=4)
