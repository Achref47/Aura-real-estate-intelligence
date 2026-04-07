import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <div className="sidebar">
      <h2>🏠 PIE</h2>

      <nav>

        {/* SELLER (PRIMARY) */}
        <NavLink to="/valuation" className="nav-item">
          💰 Valuation
        </NavLink>
        
        <NavLink to="/market" className="nav-item">
  🧠 Market Intelligence
        </NavLink>
<NavLink to="/seller-portal" className="nav-item">
  🏠 Seller Portal
</NavLink>

<NavLink to="/simulation" className="nav-item">
          📊 Simulation
        </NavLink>
        {/* BUYER (SECONDARY) */}
        <NavLink to="/investment" className="nav-item">
          📈 Investment
        </NavLink>
        {/* AI */}
        <NavLink to="/ai" className="nav-item">
          🤖 AI Assistant
        </NavLink>

      </nav>
    </div>
  );
}