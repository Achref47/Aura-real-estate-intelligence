import { Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";

import Sidebar from "./components/Sidebar";
import SellerPortal from "./pages/SellerPortal";

// Pages
import Analysis from "./pages/Analysis";
import AIAssistant from "./pages/AIAssistant";
import SimulationPage from "./pages/SimulationPage";
import Valuation from "./pages/Valuation";
import MarketIntelligence from "./pages/MarketIntelligence";

function App() {

  const [result, setResult] = useState(null);

  return (
    <div className="app-layout">

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="container">
        <Routes>

          {/* Default → Seller FIRST */}
          <Route path="/" element={<Navigate to="/valuation" />} />

          {/* SELLER (FPI) 🔥 */}
          <Route path="/valuation" element={<Valuation />} />
          <Route path="/seller-portal" element={<SellerPortal />} />

          {/* BUYER (PropCheck) */}
          <Route 
            path="/investment" 
            element={<Analysis setResult={setResult} />} 
          />

          {/* SIMULATION */}
          <Route 
            path="/simulation" 
            element={<SimulationPage setResult={setResult} />} 
          />

          {/* MARKET */}
          <Route path="/market" element={<MarketIntelligence />} />

          {/* AI ASSISTANT */}
          <Route path="/ai" element={<AIAssistant />} />

        </Routes>
      </div>

    </div>
  );
}

export default App;