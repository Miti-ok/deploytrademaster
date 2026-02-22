from core import state


class RiskEngine:
    @staticmethod
    def _material_origin(material):
        if isinstance(material, dict):
            return material.get("origin_country")
        return getattr(material, "origin_country", None)

    def calculate_risk(
        self,
        manufacturing_country: str,
        destination_country: str,
        total_duty_percent: float,
        materials: list
    ) -> float:
        """
        Returns a risk score between 0 and 100.
        """
        origin_risk = state.COUNTRY_RISK.get(manufacturing_country, 50)
        destination_risk = state.COUNTRY_RISK.get(destination_country, 50)

        tariff_risk = total_duty_percent * 1.5

        sourcing_countries = {
            origin for origin in (self._material_origin(m) for m in materials) if origin
        }
        complexity_risk = len(sourcing_countries) * 5

        risk_score = (
            origin_risk * 0.35 +
            destination_risk * 0.25 +
            tariff_risk * 0.25 +
            complexity_risk * 0.15
        )

        risk_score = max(0, min(100, risk_score))
        return round(risk_score, 2)
