# decision_engine.py

def generate_decision(input_data, fpi_output, market_data):
    """
    Seller Decision Engine (Rezerva-aligned, clean, explainable)
    Returns a seller-side pricing strategy, not a buyer-side investment decision.
    """

    def safe_text(value, default="N/A"):
        if value is None:
            return default
        text = str(value).strip()
        return text if text else default

    def score_price(position: str) -> int:
        position = position.lower()
        if "undervalued" in position:
            return 2
        if "fair" in position:
            return 1
        return -2

    def score_demand(demand: str) -> int:
        demand = demand.lower()
        if "high" in demand:
            return 2
        if "moderate" in demand:
            return 1
        return -1

    def score_risk(risk: str) -> int:
        risk = risk.lower()
        if "low" in risk:
            return 2
        if "moderate" in risk:
            return 0
        return -2

    # Extract only the fields we need
    price_position = safe_text(fpi_output.get("price_position"))
    risk_level = safe_text(fpi_output.get("risk_level"))
    demand_pressure = safe_text(market_data.get("demand_pressure"))
    market_segment = safe_text(market_data.get("market_segment"))
    liquidity = safe_text(market_data.get("liquidity"))
    market_context = safe_text(market_data.get("market_context"))
    market_score = market_data.get("market_score")

    # Seller-side scoring
    price_score = score_price(price_position)
    demand_score = score_demand(demand_pressure)
    risk_score = score_risk(risk_level)

    # Small context bonuses/penalties
    segment_bonus = 0
    if "entry" in market_segment.lower() or "affordable" in market_segment.lower():
        segment_bonus = 1
    elif "premium" in market_segment.lower():
        segment_bonus = -1

    liquidity_bonus = 0
    if "fast" in liquidity.lower():
        liquidity_bonus = 1
    elif "slow" in liquidity.lower():
        liquidity_bonus = -1

    decision_score = price_score + demand_score + risk_score + segment_bonus + liquidity_bonus

    # Final seller decision
    if decision_score >= 5:
        decision = "Increase Price Aggressively"
    elif decision_score >= 3:
        decision = "Increase Price"
    elif decision_score == 2:
        decision = "Test Slight Price Increase"
    elif decision_score in (0, 1):
        decision = "List at Market Price"
    elif decision_score == -1:
        decision = "Monitor Market"
    elif decision_score == -2:
        decision = "Reduce Price Slightly"
    else:
        decision = "Reposition Listing"

    # Clean explanation
    if decision_score >= 3:
        summary = "strong upward pricing potential"
    elif decision_score >= 1:
        summary = "slight pricing upside with manageable risk"
    elif decision_score == 0:
        summary = "balanced market positioning"
    else:
        summary = "downward pricing pressure or execution risk"

    decision_reason = (
        f"Pricing position is {price_position.lower()}, "
        f"demand pressure is {demand_pressure.lower()}, "
        f"risk level is {risk_level.lower()}, and the market segment is {market_segment.lower()}. "
        f"The liquidity profile is {liquidity.lower()} and the market context indicates: {market_context}. "
        f"Combined signals produce a score of {decision_score}, indicating {summary}."
    )

    # Seller action
    if decision_score >= 3:
        seller_action = "Raise the asking price to capture stronger demand while the market remains supportive."
    elif decision_score >= 1:
        seller_action = "Increase price slightly and monitor buyer response closely."
    elif decision_score == 0:
        seller_action = "Keep the current listing price and monitor the market."
    elif decision_score == -1:
        seller_action = "Hold the current price for now and review demand trends."
    elif decision_score == -2:
        seller_action = "Reduce the asking price slightly to improve competitiveness."
    else:
        seller_action = "Reposition the listing with a pricing, presentation, or marketing adjustment before launch."

    return {
        "decision": decision,
        "decision_score": decision_score,
        "decision_reason": decision_reason,
        "seller_action": seller_action,
        "market_score": market_score,
    }