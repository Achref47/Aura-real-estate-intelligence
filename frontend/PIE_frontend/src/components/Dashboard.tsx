import { motion } from "framer-motion";
import ROIChart from "./ROIChart";
import AIExplanation from "./AIExplanation";

export default function Dashboard({ result }: any) {

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  // ================= RISK =================
  const getRiskLabel = (aircs: number) => {
    if (aircs > 0.7) return "Low Risk 🟢";
    if (aircs > 0.4) return "Medium Risk 🟡";
    return "High Risk 🔴";
  };

  const getRiskColor = (aircs: number) => {
    if (aircs > 0.7) return "#22c55e";
    if (aircs > 0.4) return "#f59e0b";
    return "#ef4444";
  };

  // ================= CONFIDENCE =================
  const confidence = (
    (result.aircs * 0.5 + Math.abs(result.roi) * 0.5) * 100
  ).toFixed(0);

  // ================= PRICE GAP =================
  const priceDiff = result.pred_price - result.SalePrice;
  const isUndervalued = priceDiff > 0;

  // ================= WHY DECISION =================
  const whyDecision = () => {
    let reasons: string[] = [];

    if (result.roi > 0) {
      reasons.push("Positive ROI driven by property value");
    } else {
      reasons.push("Negative ROI reduces profitability");
    }

    if (result.aircs > 0.5) {
      reasons.push("Low to moderate risk profile");
    } else {
      reasons.push("Higher risk due to condition or age");
    }

    if (result.aircs > 0.6) {
      reasons.push("Strong property quality boosts score");
    }

    return reasons;
  };

  // ================= RECOMMENDATION =================
  const recommendation = () => {
    let recs: string[] = [];

    if (result.roi < 0) {
      recs.push("Negotiate price to improve ROI");
    }

    if (result.aircs < 0.5) {
      recs.push("Improve property condition to reduce risk");
    }

    if (result.aircs > 0.6 && result.roi > 0) {
      recs.push("Strong candidate for investment");
    }

    return recs;
  };

  // ================= SIGNAL BAR =================
  const signal = Math.min(Math.max((result.aircs + result.roi) / 2, 0), 1);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="dashboard"
    >
      {/* ================= TITLE ================= */}
      <motion.h2 variants={item}>
        📊 Investment Analysis (Buyer)
      </motion.h2>

      {/* ================= CARDS ================= */}
      <motion.div className="cards" variants={container}>

        <motion.div className="card" variants={item}>
          <h3>Predicted Price</h3>
          <p>${result.pred_price.toFixed(0)}</p>
        </motion.div>

        <motion.div className="card" variants={item}>
          <h3>ROI</h3>
          <p style={{ color: result.roi > 0 ? "#22c55e" : "#ef4444" }}>
            {(result.roi * 100).toFixed(2)}%
          </p>
        </motion.div>

        <motion.div className="card" variants={item}>
          <h3 title="Risk score based on property condition and features">
            Risk Score
          </h3>

          <p style={{ color: getRiskColor(result.aircs) }}>
            {result.aircs.toFixed(2)}
          </p>

          <span>{getRiskLabel(result.aircs)}</span>
        </motion.div>

      </motion.div>

      {/* ================= ROI CHART ================= */}
      <div style={{ marginTop: "30px" }}>
        <ROIChart roi={result.roi} />
      </div>

      {/* ================= DECISION ================= */}
      <motion.div
        variants={item}
        className={`decision ${result.decision}`}
      >
        Investment Decision: {result.decision}
      </motion.div>

      {/* ================= SIGNAL BAR ================= */}
      <div style={{ marginTop: "20px" }}>
        <div style={{
          height: "8px",
          background: "#e5e7eb",
          borderRadius: "10px"
        }}>
          <div style={{
            width: `${signal * 100}%`,
            height: "100%",
            background: "#3b82f6",
            borderRadius: "10px"
          }} />
        </div>
        <p style={{ textAlign: "center", marginTop: "5px" }}>
          Investment Strength
        </p>
      </div>

      {/* ================= CONFIDENCE ================= */}
      <div style={{ marginTop: "20px" }}>
        <strong>Confidence:</strong> {confidence}%
      </div>

      {/* ================= PRICE BADGE ================= */}
      <div style={{ marginTop: "20px" }}>
        {isUndervalued ? (
          <span style={{ color: "#22c55e" }}>
            🟢 Undervalued by ${Math.abs(priceDiff).toFixed(0)}
          </span>
        ) : (
          <span style={{ color: "#ef4444" }}>
            🔴 Overpriced by ${Math.abs(priceDiff).toFixed(0)}
          </span>
        )}
      </div>

      {/* ================= WHY DECISION ================= */}
      <div style={{ marginTop: "30px" }}>
        <h3>🧠 Why this decision?</h3>
        <ul>
          {whyDecision().map((r, i) => (
            <li key={i}>• {r}</li>
          ))}
        </ul>
      </div>

      {/* ================= RECOMMENDATION ================= */}
      <div style={{ marginTop: "20px" }}>
        <h3>🏆 Investment Recommendations</h3>
        <ul>
          {recommendation().map((r, i) => (
            <li key={i}>→ {r}</li>
          ))}
        </ul>
      </div>

      {/* ================= AI EXPLANATION ================= */}
      <AIExplanation result={result} />

      {/* ================= SUMMARY ================= */}
      <div style={{ marginTop: "30px" }}>
        <h3>🧠 Investment Summary</h3>
        <p>{result.explanation}</p>
      </div>

    </motion.div>
  );
}