import numpy as np
import pandas as pd
import joblib
from sklearn.preprocessing import MinMaxScaler

# ----------------------------------
# LOAD MODEL + SCALER
# ----------------------------------

model = joblib.load("../models/model.pkl")
scaler = joblib.load("../models/scaler.pkl")
features = joblib.load("../models/features.pkl")


# ----------------------------------
# ENRICH MISSING FEATURES
# ----------------------------------

def enrich_missing_features(df):

    df["YrSold"] = 2010

    if "OverallCond" not in df.columns:
        df["OverallCond"] = df["OverallQual"] - 1
    df["OverallCond"] = df["OverallCond"].clip(1, 10)

    if "GarageCars" not in df.columns:
        df["GarageCars"] = 2 if df["OverallQual"].iloc[0] >= 6 else 1

    if "GarageArea" not in df.columns:
        df["GarageArea"] = df["GarageCars"] * 180

    if "TotalBsmtSF" not in df.columns:
        df["TotalBsmtSF"] = df["GrLivArea"] * 0.4

    if "BsmtFullBath" not in df.columns:
        df["BsmtFullBath"] = 1 if df["GrLivArea"].iloc[0] > 1200 else 0

    if "BsmtHalfBath" not in df.columns:
        df["BsmtHalfBath"] = 0

    if "1stFlrSF" not in df.columns:
        df["1stFlrSF"] = df["GrLivArea"] * 0.7

    if "2ndFlrSF" not in df.columns:
        df["2ndFlrSF"] = df["GrLivArea"] * 0.3

    if "FullBath" not in df.columns:
        df["FullBath"] = 2 if df["TotRmsAbvGrd"].iloc[0] > 5 else 1

    if "HalfBath" not in df.columns:
        df["HalfBath"] = 1 if df["TotRmsAbvGrd"].iloc[0] > 6 else 0

    if "YearRemodAdd" not in df.columns:
        df["YearRemodAdd"] = df["YearBuilt"] + 5

    return df


# ----------------------------------
# FEATURE ENGINEERING
# ----------------------------------

def feature_engineering(df):

    df["HouseAge"] = df["YrSold"] - df["YearBuilt"]
    df["RemodAge"] = df["YrSold"] - df["YearRemodAdd"]

    df["TotalSF"] = df["TotalBsmtSF"] + df["1stFlrSF"] + df["2ndFlrSF"]

    df["LogGrLivArea"] = np.log1p(df["GrLivArea"].clip(lower=0))
    df["Log_TotalSF"] = np.log1p(df["TotalSF"].clip(lower=0))

    df["QualityScore"] = df["OverallQual"] * df["GrLivArea"]
    df["OverallScore"] = df["OverallQual"] * df["OverallCond"]

    df["TotalBathrooms"] = (
        df["FullBath"]
        + 0.5 * df["HalfBath"]
        + df["BsmtFullBath"]
        + 0.5 * df["BsmtHalfBath"]
    )

    return df


# ----------------------------------
# AIRCS
# ----------------------------------
def compute_aircs(df):

    qual = df["OverallQual"].iloc[0] / 10
    cond = df["OverallCond"].iloc[0] / 10
    age = min(df["HouseAge"].iloc[0] / 100, 1)

    rooms = min(df["TotRmsAbvGrd"].iloc[0] / 10, 1)
    garage = min(df["GarageCars"].iloc[0] / 4, 1)
    bath = min(df["FullBath"].iloc[0] / 3, 1)

    aircs = (
        0.25 * qual +
        0.15 * cond +
        0.20 * (1 - age) +
        0.10 * rooms +
        0.15 * garage +
        0.15 * bath
    )

    return float(aircs)



# ----------------------------------
# PREDICTION (🔥 CALIBRATED)
# ----------------------------------

def predict_price(df, input_price):

    for col in features:
        if col not in df.columns:
            df[col] = 0

    X = df[features]

    # Apply scaler
    X_scaled = scaler.transform(X)

    pred = model.predict(X_scaled)[0]

    # Reverse log (if used)
    pred_price = np.expm1(pred)

    # 🔥 DEMO CALIBRATION (VERY IMPORTANT)
    adjusted_price = (pred_price * 0.6) + (input_price * 0.4)

    return float(adjusted_price)


# ----------------------------------
# ROI
# ----------------------------------

def compute_roi(pred_price, purchase_price):
    return float((pred_price - purchase_price) / (purchase_price + 1e-6))


# ----------------------------------
# DECISION
# ----------------------------------

def investment_decision(roi, aircs):

    if roi > 0.12:
        return "BUY" if aircs > 0.3 else "HOLD"

    if roi > 0.04:
        return "HOLD"

    return "REJECT"


# ----------------------------------
# EXPLANATION
# ----------------------------------

def generate_explanation(roi, aircs, pred_price, purchase_price, decision):

    text = ""

    # ROI
    if roi > 0.1:
        text += f"Strong profitability (ROI: {roi*100:.1f}%). "
    elif roi > 0.03:
        text += "Moderate return potential. "
    else:
        text += "Low or negative return. "

    # Risk
    if aircs < 0.35:
        text += "High risk property. "
    elif aircs < 0.6:
        text += "Moderate risk. "
    else:
        text += "Low risk property. "

    # Price comparison
    diff = pred_price - purchase_price
    if diff > 0:
        text += f"Undervalued by ${abs(diff):.0f}. "
    else:
        text += f"Overpriced by ${abs(diff):.0f}. "

    # Final decision
    if decision == "BUY":
        text += "Recommended investment."
    elif decision == "HOLD":
        text += "Consider with caution."
    else:
        text += "Not recommended."

    return text


# ----------------------------------
# MAIN PIPELINE
# ----------------------------------

def run_pie(input_dict):

    df = pd.DataFrame([input_dict])

    df = enrich_missing_features(df)
    df = df.apply(pd.to_numeric, errors="coerce").fillna(0)
    df = feature_engineering(df)

    aircs = compute_aircs(df)

    pred_price = predict_price(df, input_dict["SalePrice"])
    print("DEBUG → Final Predicted:", pred_price)

    roi = compute_roi(pred_price, input_dict["SalePrice"])

    decision = investment_decision(roi, aircs)

    explanation = generate_explanation(
        roi,
        aircs,
        pred_price,
        input_dict["SalePrice"],
        decision
    )

    return {
        "pred_price": pred_price,
        "roi": roi,
        "aircs": aircs,
        "decision": decision,
        "explanation": explanation,
        "input_price": input_dict["SalePrice"] ,
        "SalePrice": input_dict["SalePrice"]
    }