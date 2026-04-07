def generate_market_intelligence(input_data, pie_result):
    """
    Market Intelligence Engine (Rezerva - Market Wind)
    """

    pred_price = pie_result["pred_price"]
    aircs = pie_result["aircs"]

    # ================= MARKET SEGMENT =================
    if pred_price < 200000:
        segment = "Affordable"
    elif pred_price <= 450000:
        segment = "Entry-Level (High Demand)"
    elif pred_price <= 800000:
        segment = "Mid Market"
    else:
        segment = "Premium / Luxury"

    # ================= DEMAND PRESSURE =================
    if segment in ["Affordable", "Entry-Level (High Demand)"]:
        demand_pressure = "High"
    elif segment == "Mid Market":
        demand_pressure = "Moderate"
    else:
        demand_pressure = "Low"

    # ================= LIQUIDITY =================
    if demand_pressure == "High":
        liquidity = "Fast (30-45 days)"
    elif demand_pressure == "Moderate":
        liquidity = "Normal (45-90 days)"
    else:
        liquidity = "Slow (90+ days)"

    # ================= MACRO SIGNAL =================
    macro_signal = "Supply constrained market with strong buyer competition and rising financing costs"

    # ================= MARKET SCORE =================
    score = 0

    if demand_pressure == "High":
        score += 40
    elif demand_pressure == "Moderate":
        score += 25
    else:
        score += 10

    if aircs > 0.7:
        score += 30
    elif aircs > 0.4:
        score += 20
    else:
        score += 10

    if segment in ["Affordable", "Entry-Level (High Demand)"]:
        score += 30
    else:
        score += 15

    market_score = min(score, 100)

    # ================= MARKET CONTEXT =================
    if demand_pressure == "High":
        market_context = "This segment is highly active with strong buyer demand and limited supply"
    elif demand_pressure == "Moderate":
        market_context = "Market conditions are balanced with steady demand and moderate competition"
    else:
        market_context = "This segment has lower demand with more selective buyers and slower transactions"

    # ================= INTEREST RATE SENSITIVITY =================
    if aircs < 0.5:
        interest_sensitivity = "High sensitivity to interest rate changes"
    else:
        interest_sensitivity = "Stable under current financing conditions"

    # ================= BUYER PROFILE (🔥 ADDED) =================
    if segment in ["Affordable", "Entry-Level (High Demand)"]:
        buyer_profile = "Primarily first-time buyers supported by government financing programs"
    elif segment == "Mid Market":
        buyer_profile = "Mixed buyers including families and mid-level investors"
    else:
        buyer_profile = "High-net-worth individuals and international investors"

    return {
        "market_segment": segment,
        "demand_pressure": demand_pressure,
        "liquidity": liquidity,
        "macro_signal": macro_signal,
        "market_context": market_context,
        "interest_sensitivity": interest_sensitivity,
        "market_score": market_score,
        "buyer_profile": buyer_profile
    }