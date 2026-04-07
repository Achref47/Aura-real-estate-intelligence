from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
from pie_engine import run_pie
from chatbot import ask_ai
from fastapi.middleware.cors import CORSMiddleware
from seller_engine import generate_fpi_output
from market_engine import generate_market_intelligence
from decision_engine import generate_decision
from scenario_engine import compute_scenario_insights
app = FastAPI()

# ✅ CORS (keep for frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------
# PROPERTY INPUT (FLEXIBLE)
# ----------------------------------

class PropertyInput(BaseModel):
    # ✅ Required (minimal UX inputs)
    SalePrice: float
    GrLivArea: float
    OverallQual: int
    TotRmsAbvGrd: float
    YearBuilt: int

    # ✅ Optional (auto-generated later)
    OverallCond: Optional[int] = None
    GarageCars: Optional[int] = None
    GarageArea: Optional[float] = None
    TotalBsmtSF: Optional[float] = None
    FirstFlrSF: Optional[float] = None
    SecondFlrSF: Optional[float] = None
    FullBath: Optional[float] = None
    HalfBath: Optional[float] = None
    BsmtFullBath: Optional[float] = None
    BsmtHalfBath: Optional[float] = None
    YearRemodAdd: Optional[int] = None
    YrSold: Optional[int] = None



def preprocess_input(input_dict):

    if "FirstFlrSF" in input_dict and input_dict["FirstFlrSF"] is not None:
        input_dict["1stFlrSF"] = input_dict.pop("FirstFlrSF")

    if "SecondFlrSF" in input_dict and input_dict["SecondFlrSF"] is not None:
        input_dict["2ndFlrSF"] = input_dict.pop("SecondFlrSF")

    return input_dict



# ----------------------------------
# PREDICT ENDPOINT
# ----------------------------------

@app.post("/predict")
def predict(data: PropertyInput):
    input_dict = data.dict()

    # ✅ Fix column names for model compatibility
    if "FirstFlrSF" in input_dict and input_dict["FirstFlrSF"] is not None:
        input_dict["1stFlrSF"] = input_dict.pop("FirstFlrSF")

    if "SecondFlrSF" in input_dict and input_dict["SecondFlrSF"] is not None:
        input_dict["2ndFlrSF"] = input_dict.pop("SecondFlrSF")

    return run_pie(input_dict)


# ----------------------------------
# ROOT
# ----------------------------------

@app.get("/")
def root():
    return {"message": "AURA Backend Running 🚀"}


# ----------------------------------
# CHATBOT (UPDATED 🔥)
# ----------------------------------

class ChatRequest(BaseModel):
    message: str
    context: Optional[dict] = None


@app.post("/chat")
def chat(req: ChatRequest):
    return {
        "response": ask_ai(req.message, req.context)
    }


@app.post("/valuate")
def valuate_property(data: PropertyInput):

    input_dict = preprocess_input(data.dict())

    # STEP 1: AURA
    pie_result = run_pie(input_dict)

    # STEP 2: FPI (valuation)
    fpi_output = generate_fpi_output(input_dict, pie_result)

    # STEP 3: MARKET INTELLIGENCE 🔥
    market_data = generate_market_intelligence(input_dict, pie_result)

    # STEP 4: DECISION ENGINE 🔥
    decision_data = generate_decision(input_dict, fpi_output, market_data)

    # STEP 5: SCENARIO ENGINE 🔥
    scenario_data = compute_scenario_insights(
        input_dict,
        fpi_output,
        market_data
    )

    # STEP 6: MERGE EVERYTHING 🚀
    final_output = {
        **fpi_output,
        **market_data,
        **decision_data,
        **scenario_data
    }

    return final_output


@app.post("/market-intelligence")
def market_intelligence(data: PropertyInput):

    input_dict = preprocess_input(data.dict())

    pie_result = run_pie(input_dict)

    market_output = generate_market_intelligence(input_dict, pie_result)

    return market_output


@app.get("/report")
def generate_report():

    # 👉 Use last computed values (or mock for now)
    report = f"""
🏠 PROPERTY VALUATION REPORT (AURA – FPI ENGINE)

📌 Property Overview
- Estimated Fair Price: $35888
- Recommended Listing Price: $36642
- Market Range: $32317 — $39459
- Listing Range: $36092 — $37192

📊 Market Positioning
- Price Position: Undervalued
- Price Gap: +25888
- Market Strength: Strong
- Risk Level: High
- Confidence Score: 100%

🧠 Explainability Insights
💰 Price Explanation:
The model estimate is above the current asking price.

📊 Positioning Explanation:
The property is positioned as undervalued.

⚠️ Risk Explanation:
Higher structural sensitivity detected.

🎯 Seller Action:
Increase asking price slightly.

🌍 MARKET INTELLIGENCE (REZERVA)
- Segment: Entry-Level
- Demand: High
- Liquidity: Fast
- Market Score: 85

📉 Macro:
Supply constrained market

📊 Context:
Strong buyer demand

💰 Interest Sensitivity:
High

👤 Buyer Profile:
First-time buyers
"""

    return {"report": report}


@app.post("/decision")
def decision_endpoint(data: PropertyInput):

    input_dict = preprocess_input(data.dict())

    # Core engines
    pie_result = run_pie(input_dict)
    fpi_output = generate_fpi_output(input_dict, pie_result)
    market_data = generate_market_intelligence(input_dict, pie_result)

    # 🔥 Decision engine
    decision_output = generate_decision(input_dict, fpi_output, market_data)

    return {
        **decision_output,
        "market": market_data,
        "valuation": fpi_output
    }
