import { useState } from "react";
import { predictProperty } from "../services/api";
import Dashboard from "./Dashboard";

export default function PropertyForm() {
  const [form, setForm] = useState({
    SalePrice: 200000,
    GrLivArea: 1500,
    OverallQual: 7,
    TotRmsAbvGrd: 6,
    YearBuilt: 2005,   // ✅ NEW FIELD
  });

  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: any) => {
    setForm({
      ...form,
      [e.target.name]: Number(e.target.value),
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await predictProperty(form);
      setResult(res);
    } catch (err) {
      console.error("Prediction error:", err);
    }
    setLoading(false);
  };

  return (
    <div className="form-container">

      <h2>🏠 Enter Property Details</h2>

      <div className="form-grid">

        <div className="input-group">
          <label>💰 Property Price ($)</label>
          <input
            type="number"
            name="SalePrice"
            value={form.SalePrice}
            onChange={handleChange}
          />
        </div>

        <div className="input-group">
          <label>📏 Area (sqft)</label>
          <input
            type="number"
            name="GrLivArea"
            value={form.GrLivArea}
            onChange={handleChange}
          />
        </div>

        <div className="input-group">
          <label>⭐ Quality (1–10)</label>
          <input
            type="number"
            name="OverallQual"
            value={form.OverallQual}
            onChange={handleChange}
          />
        </div>

        <div className="input-group">
          <label>🛏 Rooms</label>
          <input
            type="number"
            name="TotRmsAbvGrd"
            value={form.TotRmsAbvGrd}
            onChange={handleChange}
          />
        </div>

        <div className="input-group">
          <label>🏗 Year Built</label>
          <input
            type="number"
            name="YearBuilt"
            value={form.YearBuilt}
            onChange={handleChange}
          />
        </div>

      </div>

      <button onClick={handleSubmit} className="analyze-btn">
        {loading ? "Analyzing..." : "Analyze Investment"}
      </button>

      {result && <Dashboard result={result} />}
      
    </div>
  );
}