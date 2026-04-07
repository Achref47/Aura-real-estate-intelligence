import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import API from "../services/api";
import "../index.css";

type PropertyForm = {
  SalePrice: number;
  GrLivArea: number;
  OverallQual: number;
  TotRmsAbvGrd: number;
  YearBuilt: number;
  OverallCond?: number;
  GarageCars?: number;
  GarageArea?: number;
  TotalBsmtSF?: number;
  FirstFlrSF?: number;
  SecondFlrSF?: number;
  FullBath?: number;
  HalfBath?: number;
  BsmtFullBath?: number;
  BsmtHalfBath?: number;
  YearRemodAdd?: number;
  YrSold?: number;
};

type SellerResult = {
  fair_price?: number;
  recommended_price?: number;
  market_range?: [number, number];
  listing_range?: [number, number];
  price_position?: string;
  price_gap?: number;
  confidence_score?: number;
  market_strength?: string;
  risk_level?: string;
  market_segment?: string;
  demand_pressure?: string;
  liquidity?: string;
  macro_signal?: string;
  market_context?: string;
  market_score?: number;
  decision?: string;
  decision_score?: number;
  decision_reason?: string;
  seller_action?: string;
  price_explanation?: string;
  position_explanation?: string;
  risk_explanation?: string;
};

const initialForm: PropertyForm = {
  SalePrice: 200000,
  GrLivArea: 1500,
  OverallQual: 7,
  TotRmsAbvGrd: 6,
  YearBuilt: 2005,
  OverallCond: 6,
  GarageCars: 1,
  GarageArea: 400,
  TotalBsmtSF: 800,
  FirstFlrSF: 1000,
  SecondFlrSF: 500,
  FullBath: 2,
  HalfBath: 1,
  BsmtFullBath: 1,
  BsmtHalfBath: 0,
  YearRemodAdd: 2010,
  YrSold: 2025,
};

function StatCard({
  label,
  value,
  accent = "blue",
}: {
  label: string;
  value: string | number;
  accent?: "blue" | "green" | "red" | "amber";
}) {
  const accentColor =
    accent === "green"
      ? "#16a34a"
      : accent === "red"
      ? "#dc2626"
      : accent === "amber"
      ? "#d97706"
      : "#4f6ef7";

  return (
    <div className="seller-card seller-stat-card">
      <div className="seller-card-label">{label}</div>
      <div className="seller-stat-value" style={{ color: accentColor }}>
        {value}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="seller-section">
      <div className="seller-section-title">{title}</div>
      {children}
    </div>
  );
}

export default function SellerPortal() {
  const [form, setForm] = useState<PropertyForm>(initialForm);
  const [result, setResult] = useState<SellerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeDocs, setActiveDocs] = useState<Record<string, boolean>>({
    "Title deed": true,
    "Energy certificate": false,
    "Tax documents": true,
    "ID verification": true,
    "Ownership registry": false,
  });
const navigate = useNavigate();
  const handleChange = (name: keyof PropertyForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [name]: Number(value) || 0,
    }));
  };

  const runSellerPortal = async () => {
    setLoading(true);
    try {
      const res = await API.post("/valuate", form);
      setResult(res.data);
    } catch (error) {
      console.error("Seller portal error:", error);
      alert("Could not load seller portal data.");
    } finally {
      setLoading(false);
    }
  };

const askAIAboutSeller = () => {
  if (!result) return;

  navigate("/ai", {
    state: {
      report: {
        ...form,
        ...result,
      },
      
    },
  });
};
const getSmartActions = () => {
  if (!result) return [];

  const actions = [];

  if (result.price_position === "Overpriced") {
    actions.push({
      label: "💰 Should I reduce my price or wait?",
      question: "My property is overpriced. Should I reduce the price now or wait based on current demand?"
    });
  }

  if (result.price_position === "Undervalued") {
    actions.push({
      label: "📈 Can I increase my price safely?",
      question: "My property is undervalued. Should I increase the price and how much?"
    });
  }

  if (result.demand_pressure === "High") {
    actions.push({
      label: "🔥 How to leverage high demand?",
      question: "Demand is high. How can I maximize my selling price and negotiation power?"
    });
  }

  if (result.demand_pressure === "Low") {
    actions.push({
      label: "📉 How to attract buyers?",
      question: "Demand is low. What should I change to attract buyers?"
    });
  }

  if (result.risk_level === "High") {
    actions.push({
      label: "⚠️ How serious is the risk?",
      question: "Risk level is high. What are the risks and how can I mitigate them?"
    });
  }

  if (result.decision) {
    actions.push({
      label: "🧠 Explain this decision",
      question: `Explain why the system recommends ${result.decision} and what I should do next.`
    });
  }

  return actions;
};

const askAI = (question: string) => {
  if (!result) return;

  navigate("/ai", {
    state: {
      report: {
        ...form,
        ...result,
      },
      question
    },
  });
};

const smartActions = getSmartActions();


  const documentCompletion = useMemo(() => {
    const total = Object.keys(activeDocs).length;
    const done = Object.values(activeDocs).filter(Boolean).length;
    return Math.round((done / total) * 100);
  }, [activeDocs]);

  const listingStage = useMemo(() => {
    const decision = result?.decision?.toLowerCase() || "";

    if (decision.includes("increase")) return "Pricing Review";
    if (decision.includes("list")) return "Ready to Publish";
    if (decision.includes("monitor")) return "Waiting";
    if (decision.includes("reduce")) return "Repricing";
    if (decision.includes("reposition")) return "Repositioning";
    return "Draft";
  }, [result]);

  const introRequests = [
    {
      name: "Anonymous Buyer A",
      status: "Pending approval",
      note: "First-time buyer, strong financing profile.",
    },
    {
      name: "Anonymous Buyer B",
      status: "Reviewed",
      note: "Investor profile, interested in fast closing.",
    },
  ];

  const trackerSteps = [
    "Intake",
    "Fair Price Anchoring",
    "Documents",
    "Listing",
    "Introductions",
    "CPCV",
    "Closing",
  ];

  const currentStep =
    listingStage === "Ready to Publish"
      ? "Listing"
      : listingStage === "Pricing Review" || listingStage === "Repricing"
      ? "Fair Price Anchoring"
      : listingStage === "Waiting"
      ? "Intake"
      : "Documents";

  const isDone = (step: string) =>
    trackerSteps.indexOf(step) < trackerSteps.indexOf(currentStep);

  const isActive = (step: string) => step === currentStep;

  return (
    <div className="seller-portal-page">
      <style>{`
        .seller-portal-page {
          min-height: 100vh;
          background: #f7f4ee;
          color: #1c1c1e;
          padding: 28px 28px 40px;
        }

        .seller-shell {
          max-width: 1440px;
          margin: 0 auto;
        }

        .seller-hero {
          margin-bottom: 24px;
        }

        .seller-kicker {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #4f6ef7;
          margin-bottom: 10px;
        }

        .seller-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(40px, 5vw, 60px);
          line-height: 1;
          margin: 0;
          color: #111;
        }

        .seller-subtitle {
          margin-top: 10px;
          color: #7b7b7b;
          font-size: 15px;
        }

        .seller-grid {
          display: grid;
          grid-template-columns: 1.15fr 1fr;
          gap: 22px;
          align-items: start;
        }

        .seller-card {
          background: #fff;
          border: 1px solid #e6e2da;
          border-radius: 22px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.05);
          overflow: hidden;
        }

        .seller-card-accent {
          position: relative;
        }

        .seller-card-accent::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #4f6ef7, #86a1ff);
        }

        .seller-card-inner {
          padding: 24px;
        }

        .seller-card-label {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #a2a2a2;
          margin-bottom: 10px;
        }

        .seller-stat-value {
          font-family: 'DM Mono', monospace;
          font-size: 24px;
          font-weight: 700;
          line-height: 1.1;
        }

        .seller-stat-card {
          padding: 18px 20px;
        }

        .seller-top-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-top: 18px;
        }

        .seller-top-grid-2 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-top: 14px;
        }

        .seller-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-top: 14px;
        }

        .seller-panel {
          background: #fff;
          border: 1px solid #e6e2da;
          border-radius: 22px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.05);
          padding: 22px;
        }

        .seller-section {
          margin-top: 20px;
        }

        .seller-section-title {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #4f6ef7;
          margin-bottom: 12px;
        }

        .seller-input-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
        }

        .seller-input {
          width: 100%;
          padding: 12px 12px;
          border: 1px solid #ddd7cd;
          border-radius: 12px;
          background: #faf8f3;
          color: #111;
          outline: none;
          font-size: 14px;
        }

        .seller-input:focus {
          border-color: #4f6ef7;
          box-shadow: 0 0 0 3px rgba(79,110,247,0.12);
        }

        .seller-btn {
          width: 100%;
          padding: 14px 18px;
          margin-top: 14px;
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, #4f6ef7, #3954d5);
          color: #fff;
          font-family: 'DM Mono', monospace;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(79,110,247,0.2);
        }

        .seller-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .seller-badge-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 10px;
        }

        .seller-badge {
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid #cfe6d4;
          background: #f3fff5;
          color: #1e8f42;
          font-size: 12px;
          font-family: 'DM Mono', monospace;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .seller-badge.red {
          border-color: #ffd0d0;
          background: #fff4f4;
          color: #dc2626;
        }

        .seller-badge.blue {
          border-color: #d3dcff;
          background: #f4f7ff;
          color: #4f6ef7;
        }

        .seller-doc-list {
          display: grid;
          gap: 10px;
        }

        .seller-doc-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border: 1px solid #ece7de;
          border-radius: 14px;
          padding: 12px 14px;
          background: #fff;
        }

        .seller-doc-name {
          font-weight: 600;
          color: #222;
        }

        .seller-doc-status {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .seller-progress {
          height: 10px;
          background: #ece7de;
          border-radius: 999px;
          overflow: hidden;
          margin-top: 12px;
        }

        .seller-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4f6ef7, #40b66b);
          width: 0%;
        }

        .seller-tracker {
          display: grid;
          gap: 10px;
          margin-top: 12px;
        }

        .seller-track-step {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 12px 14px;
          border: 1px solid #ebe7df;
          border-radius: 14px;
          background: #fff;
        }

        .seller-track-dot {
          width: 12px;
          height: 12px;
          border-radius: 999px;
          background: #d7d7d7;
          flex: 0 0 auto;
        }

        .seller-track-dot.active {
          background: #4f6ef7;
        }

        .seller-track-dot.done {
          background: #16a34a;
        }

        .seller-track-title {
          font-weight: 600;
        }

        .seller-track-meta {
          font-size: 12px;
          color: #777;
        }

        .seller-intro-list {
          display: grid;
          gap: 12px;
        }

        .seller-intro-card {
          border: 1px solid #ebe7df;
          border-radius: 16px;
          padding: 14px;
          background: #fff;
        }

        .seller-intro-name {
          font-weight: 700;
          margin-bottom: 4px;
        }

        .seller-intro-note {
          font-size: 13px;
          color: #666;
          line-height: 1.55;
        }

        .seller-actions {
          display: flex;
          gap: 10px;
          margin-top: 12px;
          flex-wrap: wrap;
        }

        .seller-action-btn {
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid #ddd7cd;
          background: #fff;
          cursor: pointer;
          font-family: 'DM Mono', monospace;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-size: 11px;
        }

        .seller-action-btn.primary {
          background: #4f6ef7;
          border-color: #4f6ef7;
          color: #fff;
        }

        .seller-note {
          border-radius: 16px;
          padding: 16px;
          background: #f4f7ff;
          border: 1px solid #ccd8ff;
          font-size: 14px;
          line-height: 1.65;
          color: #333;
        }

        @media (max-width: 1280px) {
          .seller-grid {
            grid-template-columns: 1fr;
          }

          .seller-input-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .seller-row,
          .seller-top-grid,
          .seller-top-grid-2 {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .seller-portal-page {
            padding: 18px;
          }

          .seller-input-grid,
          .seller-row,
          .seller-top-grid,
          .seller-top-grid-2 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="seller-shell">
        <div className="seller-hero">
          <div className="seller-kicker">Rezerva-aligned seller workspace</div>
          <h1 className="seller-title">Seller Portal</h1>
          <p className="seller-subtitle">
            Fair-price anchoring, demand pressure, document readiness, listing progress, and seller action in one clean flow.
          </p>
        </div>

        <div className="seller-grid">
          <div className="seller-panel seller-card-accent">
            <div className="seller-card-inner">
              <div className="seller-card-label">Property Input</div>

              <div className="seller-input-grid">
                <div>
                  <div className="seller-card-label">Sale Price</div>
                  <input
                    className="seller-input"
                    type="number"
                    value={form.SalePrice}
                    onChange={(e) => handleChange("SalePrice", e.target.value)}
                  />
                </div>

                <div>
                  <div className="seller-card-label">Living Area</div>
                  <input
                    className="seller-input"
                    type="number"
                    value={form.GrLivArea}
                    onChange={(e) => handleChange("GrLivArea", e.target.value)}
                  />
                </div>

                <div>
                  <div className="seller-card-label">Quality</div>
                  <input
                    className="seller-input"
                    type="number"
                    value={form.OverallQual}
                    onChange={(e) => handleChange("OverallQual", e.target.value)}
                  />
                </div>

                <div>
                  <div className="seller-card-label">Rooms</div>
                  <input
                    className="seller-input"
                    type="number"
                    value={form.TotRmsAbvGrd}
                    onChange={(e) => handleChange("TotRmsAbvGrd", e.target.value)}
                  />
                </div>

                <div>
                  <div className="seller-card-label">Year Built</div>
                  <input
                    className="seller-input"
                    type="number"
                    value={form.YearBuilt}
                    onChange={(e) => handleChange("YearBuilt", e.target.value)}
                  />
                </div>
              </div>

              <button className="seller-btn" onClick={runSellerPortal} disabled={loading}>
                {loading ? "Analyzing..." : "Run Seller Analysis"}
              </button>

              <div className="seller-badge-row">
                <span className="seller-badge">Seller First</span>
                <span className="seller-badge blue">Rezerva Flow</span>
                <span className="seller-badge">Demand Pressure</span>
                <span className="seller-badge red">Risk-aware</span>
              </div>

              {result && (
                <>
                  <div className="seller-top-grid">
                    <StatCard label="Fair Price" value={`$${Number(result.fair_price || 0).toLocaleString()}`} />
                    <StatCard label="Recommended Price" value={`$${Number(result.recommended_price || 0).toLocaleString()}`} />
                    <StatCard label="Price Position" value={result.price_position || "N/A"} accent="green" />
                    <StatCard label="Confidence" value={`${Number(result.confidence_score || 0)}%`} accent="amber" />
                  </div>

                  <div className="seller-top-grid-2">
                    <StatCard
                      label="Market Segment"
                      value={result.market_segment || "N/A"}
                      accent="blue"
                    />
                    <StatCard
                      label="Demand Pressure"
                      value={result.demand_pressure || "N/A"}
                      accent="green"
                    />
                    <StatCard
                      label="Liquidity"
                      value={result.liquidity || "N/A"}
                    />
                  </div>

                  <div className="seller-row">
                    <StatCard label="Market Strength" value={result.market_strength || "N/A"} accent="green" />
                    <StatCard label="Risk Level" value={result.risk_level || "N/A"} accent="red" />
                    <StatCard label="Seller Strategy" value={result.decision || "N/A"} accent="amber" />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="seller-panel seller-card-accent">
            <div className="seller-card-inner">
              <div className="seller-card-label">Seller Flow</div>

              {result ? (
                <>
                  <Section title="Demand Pressure Panel">
                    <div className="seller-note">
                      <strong>Macro:</strong> {result.macro_signal || "N/A"}
                      <br />
                      <strong>Market context:</strong> {result.market_context || "N/A"}
                      <br />
                      <strong>Market score:</strong> {result.market_score ?? "N/A"}
                    </div>
                  </Section>

                  <Section title="Document Manager">
                    <div className="seller-doc-list">
                      {Object.entries(activeDocs).map(([name, checked]) => (
                        <div className="seller-doc-item" key={name}>
                          <div>
                            <div className="seller-doc-name">{name}</div>
                            <div className="seller-doc-status">
                              {checked ? "Ready" : "Missing"}
                            </div>
                          </div>
                          <button
                            className="seller-action-btn"
                            onClick={() =>
                              setActiveDocs((prev) => ({
                                ...prev,
                                [name]: !prev[name],
                              }))
                            }
                          >
                            {checked ? "Mark Missing" : "Mark Ready"}
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="seller-progress">
                      <div
                        className="seller-progress-fill"
                        style={{ width: `${documentCompletion}%` }}
                      />
                    </div>
                    <div className="seller-card-label" style={{ marginTop: 8 }}>
                      Document readiness {documentCompletion}%
                    </div>
                  </Section>

                  <Section title="Listing Status Tracker">
                    <div className="seller-tracker">
                      {trackerSteps.map((step) => {
                        const state = isDone(step)
                          ? "done"
                          : isActive(step)
                          ? "active"
                          : "";

                        return (
                          <div className="seller-track-step" key={step}>
                            <div className={`seller-track-dot ${state}`} />
                            <div>
                              <div className="seller-track-title">{step}</div>
                              <div className="seller-track-meta">
                                {isActive(step)
                                  ? "Current stage"
                                  : isDone(step)
                                  ? "Completed"
                                  : "Upcoming"}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Section>

                  <Section title="Introduction Approval">
                    <div className="seller-intro-list">
                      {introRequests.map((req) => (
                        <div className="seller-intro-card" key={req.name}>
                          <div className="seller-intro-name">{req.name}</div>
                          <div className="seller-intro-note">{req.note}</div>
                          <div className="seller-badge-row" style={{ marginTop: 10 }}>
                            <span className="seller-badge blue">{req.status}</span>
                          </div>
                          <div className="seller-actions">
                            <button className="seller-action-btn primary">Approve</button>
                            <button className="seller-action-btn">Decline</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>

                  <Section title="Transaction Tracker">
                    <div className="seller-note">
                      <strong>Current recommendation:</strong> {result.decision || "N/A"}
                      <br />
                      <strong>Action:</strong> {result.seller_action || "N/A"}
                      <br />
                      <strong>Decision reason:</strong> {result.decision_reason || "N/A"}
                    </div>
                  </Section>

                  <div className="seller-actions" style={{ marginTop: "14px", flexDirection: "column", alignItems: "flex-start" }}>
  
  {/* Main button (keep it) */}
  <button
    className="seller-action-btn primary"
    onClick={askAIAboutSeller}
    disabled={!result}
  >
    Ask AI About Seller Strategy
  </button>

  {/* 🔥 Dynamic Smart Actions */}
  {smartActions.length > 0 && (
    <div style={{ marginTop: "12px", width: "100%" }}>
      <div className="seller-section-title">AI Recommended Actions</div>

      <div className="seller-actions">
        {smartActions.map((action, index) => (
          <button
            key={index}
            className="seller-action-btn"
            onClick={() => askAI(action.question)}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )}
</div>
                </>
              ) : (
                <div className="seller-note">
                  Run a seller analysis to load the portal. This page is a separate Rezerva-style seller workspace, so your valuation and market intelligence stay clean and isolated from the buyer flow.  
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}