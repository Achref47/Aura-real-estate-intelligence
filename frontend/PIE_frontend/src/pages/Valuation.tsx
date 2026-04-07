import { useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import API from "../services/api";

// ─── Types ────────────────────────────────────────────────────────────────────
type PricePosition = "Overpriced" | "Undervalued" | "Fair";
type RiskLevel     = "Low" | "Moderate" | "High";
type MarketStr     = "Strong" | "Balanced" | "Weak";

interface ValuationResult {
  fair_price?:          number;
  recommended_price?:   number;
  market_range?:        [number, number];
  listing_range?:       [number, number];
  price_position?:      PricePosition;
  price_gap?:           number;
  confidence_score?:    number;
  risk_level?:          RiskLevel;
  market_strength?:     MarketStr;
  price_explanation?:   string;
  risk_explanation?:    string;
  position_explanation?:string;
  seller_action?:       string;
}

interface FormState {
  SalePrice:    number | "";
  GrLivArea:    number | "";
  OverallQual:  number | "";
  TotRmsAbvGrd: number | "";
  YearBuilt:    number | "";
  OverallCond:  number | "";
  GarageCars:   number | "";
  GarageArea:   number | "";
  FullBath:     number | "";
  HalfBath:     number | "";
  YearRemodAdd: number | "";
  YrSold:       number | "";
}

// ─── Field Config ─────────────────────────────────────────────────────────────
const FIELDS: { key: keyof FormState; label: string; placeholder: string }[] = [
  { key: "SalePrice",    label: "Sale Price ($)",      placeholder: "e.g. 250000" },
  { key: "GrLivArea",   label: "Living Area (sqft)",   placeholder: "e.g. 1800"   },
  { key: "OverallQual",  label: "Overall Quality",     placeholder: "1 – 10"      },
  { key: "TotRmsAbvGrd", label: "Total Rooms",         placeholder: "e.g. 7"      },
  { key: "YearBuilt",   label: "Year Built",           placeholder: "e.g. 2000"   },
  { key: "OverallCond",  label: "Overall Condition",   placeholder: "1 – 10"      },
  { key: "GarageCars",   label: "Garage Cars",         placeholder: "e.g. 2"      },
  { key: "GarageArea",   label: "Garage Area (sqft)",  placeholder: "e.g. 500"    },
  { key: "FullBath",     label: "Full Bathrooms",      placeholder: "e.g. 2"      },
  { key: "HalfBath",     label: "Half Bathrooms",      placeholder: "e.g. 1"      },
  { key: "YearRemodAdd", label: "Year Remodeled",      placeholder: "e.g. 2015"   },
  { key: "YrSold",       label: "Year Sold",           placeholder: "e.g. 2023"   },
];

const INITIAL: FormState = {
  SalePrice: "", GrLivArea: "", OverallQual: "", TotRmsAbvGrd: "",
  YearBuilt: "", OverallCond: "", GarageCars: "", GarageArea: "",
  FullBath: "", HalfBath: "", YearRemodAdd: "", YrSold: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const n  = (v: any) => Math.abs(Number(v ?? 0)) || 0;
const $  = (v: any) => `$${n(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const semanticClass = (v?: string): "green" | "amber" | "red" => {
  if (v === "Undervalued" || v === "Strong" || v === "Low")      return "green";
  if (v === "Fair"        || v === "Balanced" || v === "Moderate") return "amber";
  return "red";
};

const actionClass = (position?: string): "green" | "amber" | "red" =>
  position === "Undervalued" ? "green" : position === "Fair" ? "amber" : "red";

// ─── Animation Variants ───────────────────────────────────────────────────────
const containerV = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.07 } },
};

const itemV = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function Valuation() {
  const [form,    setForm]    = useState<FormState>(INITIAL);
  const [result,  setResult]  = useState<ValuationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setForm(prev => ({
      ...prev,
      [e.target.name]: val === "" ? "" : Number(val),
    }));
  }, []);

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cleaned = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v === "" ? undefined : v])
      );
      const res = await API.post<ValuationResult>("/valuate", cleaned);
      setResult(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to reach the model server. Make sure the API is running.");
    } finally {
      setLoading(false);
    }
  }, [form]);

  // Derived
  const confidence     = useMemo(() => Math.min(n(result?.confidence_score), 100), [result]);
  const confClass      = confidence > 70 ? "green" : confidence > 40 ? "amber" : "red";
  const confColor      = confidence > 70 ? "var(--green)" : confidence > 40 ? "var(--amber)" : "var(--red)";

  return (
    <motion.div
      className="dashboard"
      variants={containerV}
      initial="hidden"
      animate="show"
    >

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <motion.div className="page-header" variants={itemV}>
        <p className="page-header__eyebrow">FPI Engine</p>
        <h1 className="page-header__title">Seller Valuation</h1>
        <p className="page-header__sub">
          AI-powered fair price, market positioning & risk analysis for sellers.
        </p>
      </motion.div>

      {/* ── Input Panel ───────────────────────────────────────────────────── */}
      <motion.div className="panel" variants={itemV} style={{ marginBottom: 24 }}>
        <p className="panel__label">Property Details</p>

        <div className="form-grid">
          {FIELDS.map(({ key, label, placeholder }) => (
            <div className="input-group" key={key}>
              <label htmlFor={key}>{label}</label>
              <input
                id={key}
                name={key}
                type="number"
                placeholder={placeholder}
                value={form[key]}
                onChange={handleChange}
              />
            </div>
          ))}
        </div>

        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={loading}
          style={{ width: "100%", padding: "14px" }}
        >
          {loading ? "Analyzing…" : "▶ Run Valuation"}
        </button>

        {loading && (
          <div className="loading-dots">
            <span /><span /><span />
          </div>
        )}

        {error && (
          <div style={{
            marginTop: 14, padding: "11px 14px", borderRadius: 8,
            background: "var(--red-bg)", border: "1px solid var(--red-border)",
            fontSize: 13, color: "var(--red)",
          }}>
            ⚠️ {error}
          </div>
        )}
      </motion.div>

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {result && (
        <motion.div variants={containerV} initial="hidden" animate="show">

          {/* Price KPIs */}
          <motion.div variants={itemV} style={{ marginBottom: 8 }}>
            <p className="section-label">Valuation</p>
          </motion.div>

          <motion.div className="cards" variants={itemV} style={{ marginBottom: 20 }}>

            <motion.div className="card" variants={itemV}>
              <p className="card__label">Fair Price</p>
              <p className="card__value accent">{$(result.fair_price)}</p>
            </motion.div>

            <motion.div className="card" variants={itemV}>
              <p className="card__label">Recommended Price</p>
              <p className="card__value">{$(result.recommended_price)}</p>
            </motion.div>

            <motion.div className="card" variants={itemV}>
              <p className="card__label">Market Range</p>
              <p className="card__value" style={{ fontSize: 16 }}>
                {$(result.market_range?.[0])} – {$(result.market_range?.[1])}
              </p>
            </motion.div>

            <motion.div className="card" variants={itemV}>
              <p className="card__label">Listing Range</p>
              <p className="card__value" style={{ fontSize: 16 }}>
                {$(result.listing_range?.[0])} – {$(result.listing_range?.[1])}
              </p>
            </motion.div>

          </motion.div>

          {/* Status KPIs */}
          <motion.div variants={itemV} style={{ marginBottom: 8 }}>
            <p className="section-label">Market Position</p>
          </motion.div>

          <motion.div className="cards" variants={itemV} style={{ marginBottom: 20 }}>

            <motion.div className="card" variants={itemV}>
              <p className="card__label">Price Position</p>
              <p className={`card__value ${semanticClass(result.price_position)}`}>
                {result.price_position}
              </p>
            </motion.div>

            <motion.div className="card" variants={itemV}>
              <p className="card__label">Price Gap</p>
              <p className={`card__value ${result.price_gap! > 0 ? "red" : "green"}`}>
                {result.price_gap! > 0 ? "+" : "–"}{$(result.price_gap)}
              </p>
            </motion.div>

            <motion.div className="card" variants={itemV}>
              <p className="card__label">Market Strength</p>
              <p className={`card__value ${semanticClass(result.market_strength)}`}>
                {result.market_strength}
              </p>
            </motion.div>

            <motion.div className="card" variants={itemV}>
              <p className="card__label">Risk Level</p>
              <p className={`card__value ${semanticClass(result.risk_level)}`}>
                {result.risk_level}
              </p>
            </motion.div>

          </motion.div>

          {/* Confidence Bar */}
          <motion.div className="panel" variants={itemV} style={{ marginBottom: 24 }}>
            <div className="progress-label">
              <span>Valuation Confidence</span>
              <span style={{ color: confColor }}>{confidence}%</span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${confidence}%`, background: confColor, opacity: 0.85 }}
              />
            </div>
            <div style={{
              display: "flex", justifyContent: "space-between",
              marginTop: 6, fontSize: 11, color: "var(--text-4)",
              fontFamily: "'DM Mono', monospace",
            }}>
              <span>Low</span>
              <span>Moderate</span>
              <span>High</span>
            </div>

            {/* Badge row */}
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <span className={`badge ${semanticClass(result.price_position)}`}>
                {result.price_position}
              </span>
              <span className={`badge ${semanticClass(result.market_strength)}`}>
                {result.market_strength} Market
              </span>
              <span className={`badge ${semanticClass(result.risk_level)}`}>
                {result.risk_level} Risk
              </span>
              <span className={`badge ${confClass}`}>
                {confidence}% Confidence
              </span>
            </div>
          </motion.div>

          {/* Explanations */}
          <motion.div variants={itemV} style={{ marginBottom: 8 }}>
            <p className="section-label">Analysis</p>
          </motion.div>

          <motion.div
            style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}
            variants={containerV}
          >
            {[
              { label: "Price Explanation",       text: result.price_explanation },
              { label: "Positioning Explanation", text: result.position_explanation },
              { label: "Risk Explanation",        text: result.risk_explanation },
            ].map(({ label, text }) => (
              <motion.div className="insight-card" key={label} variants={itemV}>
                <p className="insight-card__label">{label}</p>
                <p className="insight-card__text">{text}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Seller Action */}
          <motion.div
            className={`action-card ${actionClass(result.price_position)}`}
            variants={itemV}
          >
            <p className="action-card__label">Recommended Action</p>
            <p className="action-card__text" style={{ fontWeight: 600 }}>
              {result.seller_action}
            </p>
          </motion.div>

        </motion.div>
      )}

    </motion.div>
  );
}
