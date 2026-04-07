# ===============================
# SCENARIO ENGINE (SELLER SIDE)
# ===============================

def compute_price_position(sale_price, fair_price):
    price_gap = sale_price - fair_price

    if price_gap < -15000:
        return "Undervalued"
    elif abs(price_gap) <= 10000:
        return "Fair"
    else:
        return "Overpriced"


def compute_scenario_insights(input_data, fpi_output, market_data):
    """
    Advanced Scenario Intelligence Layer
    """

    sale_price = input_data["SalePrice"]
    fair_price = fpi_output["fair_price"]

    # 🔥 Recompute price position dynamically
    price_position = compute_price_position(sale_price, fair_price)

    demand_pressure = market_data.get("demand_pressure", "Moderate")
    risk_level = fpi_output.get("risk_level", "Moderate")

    # ================= SCORING =================
    price_score = 2 if price_position == "Undervalued" else 1 if price_position == "Fair" else -2
    demand_score = 2 if demand_pressure == "High" else 1 if demand_pressure == "Moderate" else -1
    risk_score = -2 if risk_level == "High" else 0 if risk_level == "Moderate" else 1

    scenario_score = price_score + demand_score + risk_score

    # ================= DECISION =================
    if scenario_score >= 4:
        scenario_decision = "Increase Price Aggressively"
    elif scenario_score >= 2:
        scenario_decision = "Increase Price"
    elif scenario_score == 1:
        scenario_decision = "Test Slight Price Increase"
    elif scenario_score == 0:
        scenario_decision = "List at Market Price"
    elif scenario_score == -1:
        scenario_decision = "Monitor Market"
    elif scenario_score == -2:
        scenario_decision = "Reduce Price Slightly"
    else:
        scenario_decision = "Reposition Listing"

    # ================= EXPLANATION =================
    scenario_explanation = (
        f"At this price level, the property is {price_position.lower()} relative to market value. "
        f"Demand is {demand_pressure.lower()} and risk is {risk_level.lower()}, "
        f"leading to a scenario score of {scenario_score}."
    )

    return {
        "scenario_price_position": price_position,
        "scenario_score": scenario_score,
        "scenario_decision": scenario_decision,
        "scenario_explanation": scenario_explanation
    }