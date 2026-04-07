import { useState, useRef, useCallback } from "react";
import axios from "axios";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useNavigate } from "react-router-dom";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SimulationResult {
  fair_price: number;
  recommended_price: number;
  market_range: [number, number];
  listing_range: [number, number];
  price_position: string;
  price_gap: number;
  confidence_score: number;
  market_strength: string;
  risk_level: string;
  market_segment: string;
  demand_pressure: string;
  liquidity: string;
  macro_signal: string;
  market_context: string;
  price_explanation: string;
  position_explanation: string;
  risk_explanation: string;
  seller_action: string;
  decision: string;
  decision_score: number;
  decision_reason: string;
  roi: number;
  aircs: number;
  pred_price: number;
  scenario_price_position?: string;
  scenario_decision?: string;
  scenario_explanation?: string;
  
}

interface SliderConfig {
  key: keyof FormState;
  label: string;
  icon: string;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}

interface FormState {
  price: number;
  area: number;
  quality: number;
  yearBuilt: number;
  rooms: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SLIDERS: SliderConfig[] = [
  { key: "price", label: "Sale Price", icon: "💰", min: 50000, max: 500000, step: 5000, format: v => `$${v.toLocaleString()}` },
  { key: "area", label: "Living Area", icon: "📐", min: 500, max: 4000, step: 50, format: v => `${v.toLocaleString()} sqft` },
  { key: "quality", label: "Quality Score", icon: "⭐", min: 1, max: 10, step: 1, format: v => `${v}/10` },
  { key: "yearBuilt", label: "Year Built", icon: "🏗️", min: 1950, max: 2025, step: 1, format: v => `${v}` },
  { key: "rooms", label: "Total Rooms", icon: "🛏️", min: 1, max: 10, step: 1, format: v => `${v} rooms` },
];

const INITIAL_STATE: FormState = {
  price: 200000,
  area: 1500,
  quality: 7,
  yearBuilt: 2005,
  rooms: 6,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => `$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const getRiskColor = (level: string) => {
  const l = level?.toLowerCase();
  if (l?.includes("low")) return "#22c55e";
  if (l?.includes("med")) return "#f59e0b";
  return "#ef4444";
};



const getDecisionStyle = (decision: string) => {
  const d = decision?.toLowerCase();
  if (d?.includes("increase")) return { color: "#22c55e", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.35)" };
  if (d?.includes("test")) return { color: "#16a34a", bg: "rgba(34,197,94,0.10)", border: "rgba(34,197,94,0.30)" };
  if (d?.includes("list at market")) return { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)" };
  if (d?.includes("monitor")) return { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)" };
  if (d?.includes("reduce")) return { color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.35)" };
  if (d?.includes("reposition")) return { color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.35)" };
  return { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)" };
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function GaugeArc({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = Math.min(value / max, 1);
  const r = 40;
  const circumference = Math.PI * r; // half circle
  const dash = pct * circumference;

  return (
    <div style={{ textAlign: "center" }}>
      <svg viewBox="0 0 100 60" width="120" height="72">
        <path
          d={`M 10 50 A ${r} ${r} 0 0 1 90 50`}
          fill="none" stroke="#eceaea" strokeWidth="8" strokeLinecap="round"
        />
        <path
          d={`M 10 50 A ${r} ${r} 0 0 1 90 50`}
          fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: "stroke-dasharray 1s cubic-bezier(.4,0,.2,1)" }}
        />
        <text
          x="50"
          y="48"
          textAnchor="middle"
          fill={color}
          fontSize="14"
          fontWeight="700"
          fontFamily="'DM Mono', monospace"
        >
          {value}
        </text>
      </svg>
      <p style={{ fontSize: "11px", color: "#aaa", margin: "-4px 0 0", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </p>
    </div>
  );
}

function MetricPill({ label, value, color = "#4f6ef7" }: { label: string; value: string; color?: string }) {
  return (
    <div className="metric-pill">
      <span style={{ fontSize: "12px", color: "#888", letterSpacing: "0.03em" }}>{label}</span>
      <span style={{ fontSize: "13px", fontWeight: "600", color, fontFamily: "'DM Mono', monospace" }}>{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <h4 className="section-label">{title}</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>{children}</div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SimulationPage({ setGlobalResult }: { setGlobalResult?: (r: SimulationResult) => void }) {
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement | null>(null);

  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scenarioPrice, setScenarioPrice] = useState<number>(form.price);
  const [scenarioResult, setScenarioResult] = useState<SimulationResult | null>(null);


  const updateField = useCallback((key: keyof FormState, value: number) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  // ── Run Simulation ──────────────────────────────────────────────────────────
  const runSimulation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await axios.post<SimulationResult>("http://127.0.0.1:8000/valuate", {
        SalePrice: form.price,
        GrLivArea: form.area,
        OverallQual: form.quality,
        TotRmsAbvGrd: form.rooms,
        YearBuilt: form.yearBuilt,
      });

      setResult(data);
      setGlobalResult?.(data);
    } catch (err) {
      console.error("Simulation error:", err);
      setError("Failed to connect to the model server. Make sure the API is running.");
    } finally {
      setLoading(false);
    }
  }, [form, setGlobalResult]);

  // ── PDF Export ──────────────────────────────────────────────────────────────
  const downloadPDF = useCallback(async () => {
    if (!reportRef.current) return;

    const element = reportRef.current;

    element.style.transform = "scale(1)";
    element.style.zoom = "1";

    const canvas = await html2canvas(element, {
      scale: window.devicePixelRatio * 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      width: element.scrollWidth,
      height: element.scrollHeight,
    });

    const imgData = canvas.toDataURL("image/png", 1.0);

    const pdf = new jsPDF("p", "mm", "a4");

    const pdfWidth = 210;
    const pdfHeight = 297;

    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pdfHeight;
    }

    pdf.save("AURA_Valuation_Report.pdf");
  }, []);



  //-----Scenario
  const runScenario = useCallback(async () => {
  if (!scenarioPrice) return;

  try {
    const { data } = await axios.post<SimulationResult>("http://127.0.0.1:8000/valuate", {
      SalePrice: scenarioPrice,
      GrLivArea: form.area,
      OverallQual: form.quality,
      TotRmsAbvGrd: form.rooms,
      YearBuilt: form.yearBuilt,
    });

    setScenarioResult(data);
  } catch (err) {
    console.error("Scenario error:", err);
  }
}, [scenarioPrice, form]);

  // ── Navigate to AI ──────────────────────────────────────────────────────────
  const goToAI = useCallback(() => {
    navigate("/ai", {
  state: {
    report: { ...form, ...result }
  }
});
  }, [navigate, form, result]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const decisionStyle = result ? getDecisionStyle(result.decision) : null;
  const riskColor = result ? getRiskColor(result.risk_level) : "#888";
  const decisionIcon = result?.decision?.toLowerCase().includes("increase")
    ? "↑"
    : result?.decision?.toLowerCase().includes("reduce")
    ? "↓"
    : result?.decision?.toLowerCase().includes("reposition")
    ? "↻"
    : "•";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Mono:wght@400;500&family=Geist:wght@400;500;600&display=swap');

        * { box-sizing: border-box; }

        .pie-root {
          min-height: 100vh;
          background: #f5f3ef;
          color: #1c1c1e;
          font-family: 'Geist', sans-serif;
          padding: 40px 24px 80px;
        }

        .pie-header {
          text-align: center;
          margin-bottom: 48px;
        }

        .pie-header__eyebrow {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #4f6ef7;
          margin: 0 0 12px;
        }

        .pie-header__title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(32px, 5vw, 52px);
          font-weight: 700;
          color: #111;
          margin: 0;
          line-height: 1.1;
        }

        .pie-header__sub {
          font-size: 14px;
          color: #888;
          margin: 8px 0 0;
          letter-spacing: 0.02em;
        }

        .pie-layout {
          max-width: 1100px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        @media (max-width: 768px) {
          .pie-layout { grid-template-columns: 1fr; }
        }

        .pie-panel {
          background: #ffffff;
          border: 1px solid #e4e2de;
          border-radius: 20px;
          padding: 28px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.04);
        }

        .pie-panel::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, #4f6ef7, #7c9dff);
          border-radius: 20px 20px 0 0;
        }

        .pie-panel__title {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #aaa;
          margin: 0 0 24px;
        }

        .slider-row {
          margin-bottom: 20px;
        }

        .slider-row__header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 8px;
        }

        .slider-row__label {
          font-size: 12px;
          color: #666;
          letter-spacing: 0.03em;
        }

        .slider-row__value {
          font-family: 'DM Mono', monospace;
          font-size: 13px;
          font-weight: 500;
          color: #4f6ef7;
        }

        .pie-range {
          width: 100%;
          -webkit-appearance: none;
          appearance: none;
          height: 3px;
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }

        .pie-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 17px;
          height: 17px;
          border-radius: 50%;
          background: #4f6ef7;
          border: 2.5px solid #fff;
          box-shadow: 0 0 0 3px rgba(79,110,247,0.18), 0 1px 4px rgba(0,0,0,0.12);
          transition: box-shadow 0.2s;
        }

        .pie-range:hover::-webkit-slider-thumb {
          box-shadow: 0 0 0 5px rgba(79,110,247,0.22), 0 1px 4px rgba(0,0,0,0.12);
        }

        .pie-run-btn {
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg, #4f6ef7 0%, #3a56d4 100%);
          color: #fff;
          border: none;
          border-radius: 12px;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          margin-top: 8px;
          transition: transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 4px 16px rgba(79,110,247,0.35);
        }

        .pie-run-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 7px 22px rgba(79,110,247,0.42);
        }

        .pie-run-btn:active:not(:disabled) { transform: translateY(0); }
        .pie-run-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        @keyframes pulse-dot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }

        .loading-dots { display: flex; gap: 6px; justify-content: center; margin-top: 16px; }
        .loading-dots span {
          width: 7px; height: 7px; border-radius: 50%;
          background: #4f6ef7; animation: pulse-dot 1.2s infinite;
        }
        .loading-dots span:nth-child(2) { animation-delay: 0.15s; }
        .loading-dots span:nth-child(3) { animation-delay: 0.3s; }

        .pie-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 13px;
          color: #dc2626;
          margin-top: 14px;
        }

        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .pie-result-panel {
          animation: fadeSlideUp 0.45s cubic-bezier(.4,0,.2,1) both;
        }

        .decision-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 5px 15px;
          border-radius: 999px;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          border: 1.5px solid;
        }

        .price-bar-track {
          height: 5px;
          border-radius: 3px;
          background: #eee;
          position: relative;
          margin: 8px 0 4px;
        }

        .price-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 1s cubic-bezier(.4,0,.2,1);
        }

        .metric-pill {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 9px 13px;
          border-radius: 9px;
          background: #f8f7f4;
          border: 1px solid #e8e5e0;
        }

        .action-btns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 16px;
          max-width: 1100px;
          margin-left: auto;
          margin-right: auto;
        }

        .pie-action-btn {
          padding: 13px 16px;
          border-radius: 12px;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          border: 1.5px solid #e0ddd8;
          background: #fff;
          color: #555;
          transition: all 0.18s;
          text-align: center;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
        }

        .pie-action-btn:hover {
          border-color: #c8c4be;
          background: #faf9f7;
          color: #222;
        }

        .pie-action-btn.indigo {
          background: #4f6ef7;
          border-color: #4f6ef7;
          color: #fff;
          box-shadow: 0 3px 12px rgba(79,110,247,0.3);
        }

        .pie-action-btn.indigo:hover {
          background: #3a56d4;
          border-color: #3a56d4;
          box-shadow: 0 5px 18px rgba(79,110,247,0.38);
        }

        .pie-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          min-height: 320px;
          color: #ccc;
          gap: 12px;
          text-align: center;
        }

        .pie-placeholder__icon { font-size: 44px; opacity: 0.4; }

        .pie-placeholder__text {
          font-size: 13px;
          line-height: 1.6;
          max-width: 200px;
          color: #bbb;
        }

        .pie-divider {
          height: 1px;
          background: #f0ede8;
          margin: 18px 0;
        }

        .section-label {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: #4f6ef7;
          margin: 0 0 10px;
          font-weight: 600;
        }
      `}</style>

      <div className="pie-root">
        <header className="pie-header">
          <p className="pie-header__eyebrow">Property Intelligence Engine</p>
          <h1 className="pie-header__title">Investment Simulator</h1>
          <p className="pie-header__sub">AI-powered valuation & market risk analysis</p>
        </header>

        <div className="pie-layout">
          <div className="pie-panel">
            <p className="pie-panel__title">Property Parameters</p>

            {SLIDERS.map(({ key, label, icon, min, max, step, format }) => (
              <div className="slider-row" key={key}>
                <div className="slider-row__header">
                  <span className="slider-row__label">{icon} {label}</span>
                  <span className="slider-row__value">{format(form[key])}</span>
                </div>
                <input
                  type="range"
                  className="pie-range"
                  min={min}
                  max={max}
                  step={step}
                  value={form[key]}
                  onChange={e => updateField(key, Number(e.target.value))}
                  style={{
                    background: `linear-gradient(to right, #4f6ef7 ${((form[key] - min) / (max - min)) * 100}%, #e8e5e0 0)`,
                  }}
                />
              </div>
            ))}

            <button className="pie-run-btn" onClick={runSimulation} disabled={loading}>
              {loading ? "⟳ Analyzing Property..." : "▶ Run Simulation"}
            </button>

            {loading && (
              <div className="loading-dots">
                <span /><span /><span />
              </div>
            )}

            {error && <div className="pie-error">⚠️ {error}</div>}
          </div>

          <div className="pie-panel" ref={reportRef}>
            <p className="pie-panel__title">Valuation Report</p>

            {!result ? (
              <div className="pie-placeholder">
                <div className="pie-placeholder__icon">📊</div>
                <p className="pie-placeholder__text">
                  Adjust parameters and run the simulation to see your AI-powered valuation.
                </p>
              </div>
            ) : (
              <div className="pie-result-panel">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                  <span
                    className="decision-badge"
                    style={{
                      color: decisionStyle!.color,
                      background: decisionStyle!.bg,
                      borderColor: decisionStyle!.border,
                    }}
                  >
                    <span style={{ fontSize: "14px" }}>{decisionIcon}</span>
                    {result.decision}
                  </span>
                  <GaugeArc value={result.confidence_score} max={100} color="#d4a853" label="Confidence" />
                </div>

                <Section title="Valuation">
                  <div style={{ marginBottom: "4px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#aaa", marginBottom: "4px" }}>
                      <span>Your Price</span>
                      <span>Fair Price</span>
                    </div>
                    <div className="price-bar-track">
                      <div
                        className="price-bar-fill"
                        style={{
                          width: `${Math.min((form.price / result.fair_price) * 50, 100)}%`,
                          background: result.price_gap > 0
                            ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                            : "linear-gradient(90deg, #22c55e, #16a34a)",
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontFamily: "'DM Mono', monospace" }}>
                      <span style={{ color: "#888" }}>{fmt(form.price)}</span>
                      <span style={{ color: "#4f6ef7" }}>{fmt(result.fair_price)}</span>
                    </div>
                  </div>

                  <MetricPill label="Recommended Price" value={fmt(result.recommended_price)} />
                  <MetricPill label="Market Range" value={`${fmt(result.market_range[0])} – ${fmt(result.market_range[1])}`} />
                  <MetricPill label="Listing Range" value={`${fmt(result.listing_range[0])} – ${fmt(result.listing_range[1])}`} />
                  <MetricPill
                    label={result.price_gap > 0 ? "Overpriced by" : "Undervalued by"}
                    value={fmt(result.price_gap)}
                    color={result.price_gap > 0 ? "#ef4444" : "#22c55e"}
                  />
                </Section>

                <div className="pie-divider" />

                <Section title="Market Intelligence">
                  <MetricPill label="Segment" value={result.market_segment || "N/A"} />
                  <MetricPill label="Demand Pressure" value={result.demand_pressure || "N/A"} />
                  <MetricPill label="Liquidity" value={result.liquidity || "N/A"} />
                  <MetricPill label="Market Strength" value={result.market_strength} />
                  <MetricPill label="Risk Level" value={result.risk_level} color={riskColor} />
                </Section>

                <div className="pie-divider" />

                <Section title="Analysis">
                  {[
                    { title: "Price", text: result.price_explanation },
                    { title: "Position", text: result.position_explanation },
                    { title: "Risk", text: result.risk_explanation },
                  ].map(({ title, text }) => (
                    <div
                      key={title}
                      style={{
                        padding: "12px 14px",
                        background: "#f8f7f4",
                        border: "1px solid #e8e5e0",
                        borderRadius: "10px",
                        fontSize: "12px",
                        color: "#555",
                        lineHeight: "1.6",
                      }}
                    >
                      <span
                        style={{
                          color: "#4f6ef7",
                          fontWeight: 600,
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "10px",
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          display: "block",
                          marginBottom: "4px"
                        }}
                      >
                        {title}
                      </span>
                      {text}
                    </div>
                  ))}
                </Section>

                <div className="pie-divider" />

                <Section title="Market Context">
                  <div
                    style={{
                      padding: "12px 14px",
                      background: "#f0f3ff",
                      border: "1px solid #c7d2fe",
                      borderRadius: "10px",
                      fontSize: "12px",
                      color: "#444",
                      lineHeight: "1.6",
                    }}
                  >
                    <p style={{ margin: "0 0 6px" }}>{result.macro_signal}</p>
                    <p style={{ margin: 0 }}>{result.market_context}</p>
                  </div>
                </Section>

                <div style={{
                  padding: "16px",
                  borderRadius: "12px",
                  background: `${decisionStyle!.bg}`,
                  border: `1px solid ${decisionStyle!.border}`,
                  marginBottom: "4px",
                }}>
                  <p style={{
                    margin: "0 0 6px",
                    fontSize: "10px",
                    color: decisionStyle!.color,
                    fontFamily: "'DM Mono', monospace",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    fontWeight: 600
                  }}>
                    Seller Strategy
                  </p>

                  <p style={{
  margin: "0 0 8px",
  fontSize: "18px",
  fontWeight: 700,
  color: "#111"
}}>
  {result.decision}
</p>

<p style={{
  margin: "0 0 8px",
  fontSize: "13px",
  color: "#666",
  lineHeight: "1.6"
}}>
  {result.decision_reason}
</p>

<p style={{
  margin: "0 0 10px",
  fontSize: "12px",
  color: "#999",
  fontFamily: "'DM Mono', monospace"
}}>
  Score: {result.decision_score}
</p>

<p style={{
  margin: 0,
  fontSize: "14px",
  fontWeight: 500,
  color: "#111"
}}>
  👉 {result.seller_action}
</p>
                </div>

                <p style={{ textAlign: "center", fontSize: "10px", color: "#ccc", fontFamily: "'DM Mono', monospace", letterSpacing: "0.12em", marginTop: "20px" }}>
                  AURA — Property Intelligence Engine
                </p>
              </div>
            )}
          </div>
        </div>

        {result && (
          <div style={{ maxWidth: 1100, margin: "20px auto 0" }}>
            {/* 🔥 SCENARIO SIMULATION */}
<div className="pie-panel" style={{ marginBottom: "20px" }}>
  <p className="pie-panel__title">Scenario Simulation</p>

  {/* Slider */}
  <div style={{ marginBottom: "14px" }}>
    <label style={{ fontSize: "12px", color: "#666" }}>
      Adjust Price Scenario
    </label>

    <input
      type="range"
      min={50000}
      max={500000}
      step={5000}
      value={scenarioPrice ?? form.price}
      onChange={(e) => setScenarioPrice(Number(e.target.value))}
      className="pie-range"
    />

    <div style={{
      fontFamily: "'DM Mono', monospace",
      fontSize: "13px",
      color: "#4f6ef7"
    }}>
      Scenario Price: {fmt(scenarioPrice ?? form.price)}
    </div>
  </div>

  <button className="pie-run-btn" onClick={runScenario}>
    ▶ Run Scenario
  </button>

  {/* RESULT */}
  {scenarioResult && (
    <div style={{ marginTop: "16px" }}>

      <Section title="Scenario Result">
  <MetricPill label="Fair Price" value={fmt(scenarioResult.fair_price)} />
  
  <MetricPill 
    label="Price Position" 
    value={scenarioResult.scenario_price_position || scenarioResult.price_position} 
  />

  <MetricPill 
    label="Demand" 
    value={scenarioResult.demand_pressure || "N/A"} 
  />

  <MetricPill 
    label="Risk" 
    value={scenarioResult.risk_level} 
  />

  <MetricPill 
    label="Decision" 
    value={scenarioResult.scenario_decision || scenarioResult.decision} 
  />
</Section>

<div
  style={{
    padding: "12px 14px",
    background: "#f0f3ff",
    border: "1px solid #c7d2fe",
    borderRadius: "10px",
    fontSize: "12px",
    color: "#444",
    lineHeight: "1.6",
    marginTop: "10px"
  }}
>
  <span
    style={{
      color: "#4f6ef7",
      fontWeight: 600,
      fontFamily: "'DM Mono', monospace",
      fontSize: "10px",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      display: "block",
      marginBottom: "6px"
    }}
  >
    Scenario Explanation
  </span>

  {scenarioResult.scenario_explanation || "This scenario adjusts pricing and evaluates its impact on demand, risk, and decision strategy."}
</div>

      <div className="pie-divider" />

      <Section title="Comparison">
  <MetricPill label="Current Decision" value={result.decision} />
  <MetricPill 
    label="Scenario Decision" 
    value={scenarioResult.scenario_decision || scenarioResult.decision} 
  />

  <MetricPill label="Current Position" value={result.price_position} />
  <MetricPill 
    label="Scenario Position" 
    value={scenarioResult.scenario_price_position || scenarioResult.price_position} 
  />

  <MetricPill label="Current Risk" value={result.risk_level} />
  <MetricPill label="Scenario Risk" value={scenarioResult.risk_level} />
</Section>

<Section title="Impact Analysis">
  <MetricPill 
    label="Decision Impact" 
    value={
      result.decision === (scenarioResult.scenario_decision || scenarioResult.decision)
        ? "No Change"
        : "Changed"
    } 
  />

  <MetricPill 
    label="Risk Impact" 
    value={
      result.risk_level === scenarioResult.risk_level
        ? "No Change"
        : "Changed"
    } 
  />
</Section>



    </div>
  )}
</div>
            <div className="action-btns">
              <button className="pie-action-btn" onClick={downloadPDF}>
                📄 Download PDF Report
              </button>
              <button className="pie-action-btn indigo" onClick={goToAI}>
                🤖 Ask AI — Why {result.decision}?
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}