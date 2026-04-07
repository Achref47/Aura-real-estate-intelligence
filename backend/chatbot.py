
import os
from typing import Optional, Dict, Any
from dotenv import load_dotenv
from google import genai
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def _safe_str(value: Any, default: str = "N/A") -> str:
    if value is None:
        return default
    text = str(value).strip()
    return text if text else default

def _format_context(context: Optional[Dict[str, Any]]) -> str:
    context = context or {}

    return f"""
Seller-side valuation context:
- Fair Price: {_safe_str(context.get("fair_price"))}
- Recommended Price: {_safe_str(context.get("recommended_price"))}
- Market Range: {_safe_str(context.get("market_range"))}
- Listing Range: {_safe_str(context.get("listing_range"))}
- Price Position: {_safe_str(context.get("price_position"))}
- Price Gap: {_safe_str(context.get("price_gap"))}
- Confidence Score: {_safe_str(context.get("confidence_score"))}
- Market Strength: {_safe_str(context.get("market_strength"))}
- Risk Level: {_safe_str(context.get("risk_level"))}

Market Intelligence:
- Market Segment: {_safe_str(context.get("market_segment"))}
- Demand Pressure: {_safe_str(context.get("demand_pressure"))}
- Liquidity: {_safe_str(context.get("liquidity"))}
- Macro Signal: {_safe_str(context.get("macro_signal"))}
- Market Context: {_safe_str(context.get("market_context"))}
- Market Score: {_safe_str(context.get("market_score"))}
- Buyer Profile: {_safe_str(context.get("buyer_profile"))}

Decision Layer:
- Decision: {_safe_str(context.get("decision"))}
- Decision Score: {_safe_str(context.get("decision_score"))}
- Decision Reason: {_safe_str(context.get("decision_reason"))}
- Seller Action: {_safe_str(context.get("seller_action"))}

Explainability:
- Price Explanation: {_safe_str(context.get("price_explanation"))}
- Position Explanation: {_safe_str(context.get("position_explanation"))}
- Risk Explanation: {_safe_str(context.get("risk_explanation"))}
""".strip()


def ask_ai(user_question: str, context: Optional[Dict[str, Any]] = None) -> str:
    seller_context = _format_context(context)

    prompt = f"""
You are a professional real-estate seller intelligence assistant for AURA and Rezerva.

Your job:
- Explain pricing strategy
- Explain valuation
- Explain market signals
- Help seller decide what to do

IMPORTANT RULES:
- If context is provided, always use it to answer, even if the user message is vague like "Hi" or "Hey".
- Assume the user is referring to the current property analysis.
- Never reject if context exists.
- Only reject if there is no context and the question is unrelated to real estate.

Tone:
- Clear
- Professional
- Direct
- Explain reasoning like a consultant

CONTEXT:
{seller_context}

USER QUESTION:
{user_question}
""".strip()

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        if response and response.text:
            return response.text.strip()

        return "No response received."

    except Exception as e:
        err_msg = str(e)
        print(f"AI ERROR: {err_msg}")

        if "429" in err_msg:
            return "⚠️ Quota exceeded. Please wait 30-60 seconds."

        return "⚠️ AI system error."