# seller_engine.py

def generate_fpi_output(input_data, pie_result):
    """
    Executive Seller Valuation Engine (FPI V5)
    Produces seller-facing valuation + explicit explainability fields.
    """

    def safe_num(value, default=0.0):
        try:
            if value is None:
                return default
            return float(value)
        except Exception:
            return default

    def clamp(value, low, high):
        return max(low, min(high, value))

    pred_price = safe_num(pie_result.get("pred_price", 0))
    aircs = clamp(safe_num(pie_result.get("aircs", 0)), 0, 1)
    roi = safe_num(pie_result.get("roi", 0))

    sale_price = safe_num(input_data.get("SalePrice", 0))
    gr_liv_area = safe_num(input_data.get("GrLivArea", 0))
    overall_qual = safe_num(input_data.get("OverallQual", 0))
    tot_rms = safe_num(input_data.get("TotRmsAbvGrd", 0))
    year_built = safe_num(input_data.get("YearBuilt", 0))
    overall_cond = safe_num(input_data.get("OverallCond", max(overall_qual - 1, 1)))
    garage_cars = safe_num(input_data.get("GarageCars", 0))
    garage_area = safe_num(input_data.get("GarageArea", 0))
    full_bath = safe_num(input_data.get("FullBath", 0))
    half_bath = safe_num(input_data.get("HalfBath", 0))
    year_remod = safe_num(input_data.get("YearRemodAdd", year_built + 5))
    yr_sold = safe_num(input_data.get("YrSold", 2010))

    # -----------------------------
    # Derived property signals
    # -----------------------------
    house_age = max(0.0, yr_sold - year_built)
    remod_age = max(0.0, yr_sold - year_remod)

    size_norm = clamp(gr_liv_area / 3000.0, 0.0, 1.5)
    quality_norm = clamp(overall_qual / 10.0, 0.0, 1.0)
    condition_norm = clamp(overall_cond / 10.0, 0.0, 1.0)
    age_penalty = clamp(house_age / 120.0, 0.0, 1.0)
    remod_bonus = clamp(1.0 - (remod_age / 40.0), 0.0, 1.0)

    bathroom_density = (full_bath + 0.5 * half_bath) / max(tot_rms, 1.0)
    bathroom_score = clamp(bathroom_density / 0.5, 0.0, 1.0)
    garage_score = clamp((garage_cars / 3.0) * 0.6 + (garage_area / 900.0) * 0.4, 0.0, 1.0)

    # -----------------------------
    # Price position
    # -----------------------------
    price_gap = sale_price - pred_price

    if price_gap > 5000:
        price_position = "Overpriced"
    elif price_gap < -5000:
        price_position = "Undervalued"
    else:
        price_position = "Fair"

    # -----------------------------
    # Market range
    # -----------------------------
    risk_width = 0.05 + (1.0 - aircs) * 0.06 + age_penalty * 0.03
    lower_bound = pred_price * (1 - risk_width)
    upper_bound = pred_price * (1 + risk_width)

    # -----------------------------
    # Recommended price and listing band
    # -----------------------------
    if price_position == "Undervalued":
        recommended_price = pred_price * (1.02 + 0.01 * quality_norm)
    elif price_position == "Overpriced":
        recommended_price = pred_price * (0.98 - 0.005 * age_penalty)
    else:
        recommended_price = pred_price * (1.0 + 0.005 * remod_bonus)

    list_low = recommended_price * 0.985
    list_high = recommended_price * 1.015

    # -----------------------------
    # Confidence
    # -----------------------------
    confidence_base = (aircs * 0.55) + (abs(roi) * 0.35)
    stability_bonus = (
        0.08 * condition_norm +
        0.05 * quality_norm +
        0.04 * remod_bonus +
        0.03 * clamp(garage_score, 0, 1)
    )

    confidence = int(clamp((confidence_base + stability_bonus) * 100, 0, 100))

    if confidence >= 80 and price_position != "Overpriced":
        market_strength = "Strong"
    elif confidence >= 60:
        market_strength = "Balanced"
    else:
        market_strength = "Weak"

    if price_position == "Undervalued" and aircs >= 0.5 and quality_norm >= 0.6:
        pricing_pressure = "High demand"
    elif price_position == "Overpriced" and aircs < 0.5:
        pricing_pressure = "Low demand"
    elif quality_norm >= 0.7 and size_norm >= 0.6:
        pricing_pressure = "Healthy demand"
    else:
        pricing_pressure = "Moderate demand"

    if aircs > 0.7:
        risk = "Low"
    elif aircs > 0.4:
        risk = "Moderate"
    else:
        risk = "High"

    # -----------------------------
    # Explainability fields
    # -----------------------------
    if price_position == "Undervalued":
        position_explanation = (
            "The asking price sits below the model-based fair value, so the property is positioned as undervalued."
        )
    elif price_position == "Overpriced":
        position_explanation = (
            "The asking price sits above the model-based fair value, so the property is positioned as overpriced."
        )
    else:
        position_explanation = (
            "The asking price is close to the model-based fair value, so the property is positioned as fair."
        )

    if aircs < 0.5:
        risk_explanation = (
            "AIRCS and property condition signals indicate higher sensitivity to structural or condition risk."
        )
    elif aircs < 0.7:
        risk_explanation = (
            "AIRCS indicates a moderate risk profile, meaning the property is reasonably stable but still needs review."
        )
    else:
        risk_explanation = (
            "AIRCS indicates a strong and stable property profile with low relative risk."
        )

    if price_position == "Undervalued":
        seller_action = "Increase asking price slightly"
        pricing_strategy = "Aggressive upward adjustment"
        price_explanation = (
            "The model estimate is above the current asking price, which suggests room for a small upward adjustment."
        )
    elif price_position == "Overpriced":
        seller_action = "Reduce asking price"
        pricing_strategy = "Competitive correction"
        price_explanation = (
            "The current asking price exceeds the estimated fair value, so a downward correction improves market fit."
        )
    else:
        seller_action = "Hold price and monitor response"
        pricing_strategy = "Market-aligned listing"
        price_explanation = (
            "The asking price is already aligned with the estimated fair value, so maintaining the current level is reasonable."
        )

    if confidence >= 80:
        confidence_reason = (
            "High confidence due to strong alignment between property quality, condition, and model prediction."
        )
    elif confidence >= 60:
        confidence_reason = "Moderate confidence with balanced property signals."
    else:
        confidence_reason = "Lower confidence due to weaker property signals or higher uncertainty."

    # -----------------------------
    # Executive insights
    # -----------------------------
    market_insight = position_explanation

    if aircs < 0.5:
        risk_insight = "Condition and structural signals suggest closer review before listing."
    elif aircs < 0.7:
        risk_insight = "Moderate risk profile with manageable valuation sensitivity."
    else:
        risk_insight = "Stable property profile supporting confident pricing."

    return {
        "fair_price": round(pred_price, 2),
        "recommended_price": round(recommended_price, 2),
        "market_range": [round(lower_bound, 2), round(upper_bound, 2)],
        "listing_range": [round(list_low, 2), round(list_high, 2)],
        "price_position": price_position,
        "price_gap": round(price_gap, 2),
        "confidence_score": confidence,
        "confidence_reason": confidence_reason,
        "risk_level": risk,
        "market_strength": market_strength,
        "pricing_pressure": pricing_pressure,
        "market_insight": market_insight,
        "risk_insight": risk_insight,
        "price_explanation": price_explanation,
        "risk_explanation": risk_explanation,
        "position_explanation": position_explanation,
        "seller_action": seller_action,
        "pricing_strategy": pricing_strategy
    }