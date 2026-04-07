import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import API from "../services/api";

// ─── Types ────────────────────────────────────────────────────────────────────
interface MarketResult {
  market_segment:      string;
  demand_pressure:     "High" | "Moderate" | "Low";
  liquidity:           string;
  market_score:        number;
  macro_signal:        string;
  market_context:      string;
  interest_sensitivity: string;
  buyer_profile:       string;
}

interface FormState {
  SalePrice:    number | "";
  GrLivArea:    number | "";
  OverallQual:  number | "";
  TotRmsAbvGrd: number | "";
  YearBuilt:    number | "";
}

// ─── Field Config ─────────────────────────────────────────────────────────────
const FIELDS: { key: keyof FormState; label: string; placeholder: string }[] = [
  { key: "SalePrice",    label: "Sale Price ($)",    placeholder: "e.g. 250000" },
  { key: "GrLivArea",   label: "Living Area (sqft)", placeholder: "e.g. 1800"  },
  { key: "OverallQual",  label: "Overall Quality",   placeholder: "1 – 10"     },
  { key: "TotRmsAbvGrd", label: "Total Rooms",       placeholder: "e.g. 7"     },
  { key: "YearBuilt",   label: "Year Built",         placeholder: "e.g. 2005"  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const demandClass = (v: string) => {
  if (v === "High") return "green";
  if (v === "Moderate") return "amber";
  return "red";
};

const scoreClass = (n: number) => {
  if (n > 70) return "green";
  if (n > 45) return "amber";
  return "red";
};

// ─── Animation Variants ───────────────────────────────────────────────────────
const container = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function MarketIntelligence() {
  const [form, setForm] = useState<FormState>({
    SalePrice: "", GrLivArea: "", OverallQual: "", TotRmsAbvGrd: "", YearBuilt: "",
  });

  const [result, setResult] = useState<MarketResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

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
      const res = await API.post<MarketResult>("/market-intelligence", form);
      setResult(res.data);
    } catch (err) {
      console.error(err);
      setError("Could not reach the model server. Make sure the API is running.");
    } finally {
      setLoading(false);
    }
  }, [form]);

  const scoreColor = result
    ? result.market_score > 70 ? "var(--green)" : result.market_score > 45 ? "var(--amber)" : "var(--red)"
    : "var(--accent)";

  return (
    <motion.div
      className="dashboard"
      variants={container}
      initial="hidden"
      animate="show"
    >

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <motion.div className="page-header" variants={item}>
        <p className="page-header__eyebrow">Market Wind</p>
        <h1 className="page-header__title">Market Intelligence</h1>
        <p className="page-header__sub">
          Demand signals, liquidity analysis & macro context for any property.
        </p>
      </motion.div>

      {/* ── Input Panel ───────────────────────────────────────────────────── */}
      <motion.div className="panel" variants={item} style={{ marginBottom: 24 }}>
        <p className="panel__label">Property Data</p>

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
          {loading ? "Analyzing…" : "▶ Analyze Market"}
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
        <motion.div variants={container} initial="hidden" animate="show">

          {/* KPI Cards */}
          <motion.div className="cards" variants={item} style={{ marginBottom: 20 }}>

            <motion.div className="card" variants={item}>
              <p className="card__label">Market Segment</p>
              <p className="card__value accent">{result.market_segment}</p>
            </motion.div>

            <motion.div className="card" variants={item}>
              <p className="card__label">Demand Pressure</p>
              <p className={`card__value ${demandClass(result.demand_pressure)}`}>
                {result.demand_pressure}
              </p>
            </motion.div>

            <motion.div className="card" variants={item}>
              <p className="card__label">Liquidity</p>
              <p className="card__value">{result.liquidity}</p>
            </motion.div>

            <motion.div className="card" variants={item}>
              <p className="card__label">Market Score</p>
              <p className={`card__value ${scoreClass(result.market_score)}`}>
                {result.market_score}
                <span style={{ fontSize: 14, opacity: 0.6, marginLeft: 1 }}>%</span>
              </p>
            </motion.div>

          </motion.div>

          {/* Market Strength Index */}
          <motion.div className="panel" variants={item} style={{ marginBottom: 20 }}>
            <div className="progress-label">
              <span>Market Strength Index</span>
              <span style={{ color: scoreColor }}>{result.market_score}%</span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${result.market_score}%`,
                  background: scoreColor,
                  opacity: 0.85,
                }}
              />
            </div>
            <div style={{
              display: "flex", justifyContent: "space-between",
              marginTop: 6, fontSize: 11, color: "var(--text-4)",
              fontFamily: "'DM Mono', monospace",
            }}>
              <span>Weak</span>
              <span>Balanced</span>
              <span>Strong</span>
            </div>
          </motion.div>

          {/* Insights */}
          <motion.div variants={item} style={{ marginBottom: 8 }}>
            <p className="section-label">Market Insights</p>
          </motion.div>

          <motion.div
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
            variants={container}
          >
            {[
              { label: "Macro Signal",              text: result.macro_signal },
              { label: "Market Context",            text: result.market_context },
              { label: "Interest Rate Sensitivity", text: result.interest_sensitivity },
              { label: "Buyer Profile",             text: result.buyer_profile },
            ].map(({ label, text }) => (
              <motion.div className="insight-card" key={label} variants={item}>
                <p className="insight-card__label">{label}</p>
                <p className="insight-card__text">{text}</p>
              </motion.div>
            ))}
          </motion.div>

        </motion.div>
      )}

    </motion.div>
  );
}
