from core import state
from models.response_models import TariffResponse


class TariffEngine:
    def normalize_hs(self, hs_code: str) -> str:
        raw = hs_code.replace(".", "").strip()

        if len(raw) >= 6:
            return f"{raw[:4]}.{raw[4:6]}"

        if len(raw) == 4:
            return raw

        return raw

    def calculate_tariff(
        self,
        hs_code: str,
        manufacturing_country: str,
        destination_country: str,
        declared_value: float
    ) -> TariffResponse:
        normalized_hs = self.normalize_hs(hs_code)

        tariff_data = state.TARIFFS.get(normalized_hs)

        if not tariff_data and len(normalized_hs) >= 4:
            prefix4 = normalized_hs[:4]
            prefix4_matches = [
                value for key, value in state.TARIFFS.items()
                if key.startswith(prefix4)
            ]
            if prefix4_matches:
                tariff_data = prefix4_matches[0]

        if not tariff_data and len(normalized_hs) >= 2:
            chapter2 = normalized_hs[:2]
            chapter_matches = [
                value for key, value in state.TARIFFS.items()
                if key.startswith(chapter2)
            ]
            if chapter_matches:
                avg_base = sum(item.get("base_duty", 0) for item in chapter_matches) / len(chapter_matches)
                avg_additional = (
                    sum(item.get("additional_duty", 0) for item in chapter_matches) / len(chapter_matches)
                )
                tariff_data = {
                    "base_duty": round(avg_base, 2),
                    "additional_duty": round(avg_additional, 2)
                }

        if not tariff_data:
            print(f"[WARN] No tariff found for {normalized_hs}. Applying default duty.")
            tariff_data = {
                "base_duty": 10,
                "additional_duty": 0
            }

        base_duty = tariff_data.get("base_duty", 0)
        additional_duty = tariff_data.get("additional_duty", 0)

        agreement_key = f"{manufacturing_country}-{destination_country}"
        discount = 0

        if agreement_key in state.TRADE_AGREEMENTS:
            agreement_data = state.TRADE_AGREEMENTS[agreement_key]

            if isinstance(agreement_data, dict):
                discount = agreement_data.get("discount_percent", 0)
            elif isinstance(agreement_data, (int, float)):
                discount = agreement_data

        total_percent = base_duty + additional_duty - discount

        if total_percent < 0:
            total_percent = 0

        estimated_amount = (total_percent / 100) * declared_value

        explanation = (
            f"Base duty {base_duty}% + additional duty {additional_duty}% "
            f"- trade agreement discount {discount}% "
            f"= total {total_percent}% applied on declared value."
        )

        return TariffResponse(
            base_duty=base_duty,
            additional_duty=additional_duty,
            trade_agreement_discount=-discount,
            total_duty_percent=total_percent,
            estimated_duty_amount=round(estimated_amount, 2),
            explanation=explanation
        )
