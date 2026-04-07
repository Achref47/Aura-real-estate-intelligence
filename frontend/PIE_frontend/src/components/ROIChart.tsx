import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function ROIChart({ roi }: any) {

  const value = Math.max(Math.min(roi * 100, 100), -100);
  const isPositive = value >= 0;

  const data = {
    labels: ["Impact", "Remaining"],
    datasets: [
      {
        data: [Math.abs(value), 100 - Math.abs(value)],
        backgroundColor: [
          isPositive ? "#22c55e" : "#ef4444",
          "#1e293b"
        ],
        borderWidth: 0
      }
    ]
  };

  return (
    <div style={{ width: "220px", margin: "auto" }}>
      
      {/* 🔥 LABEL */}
      <p style={{ textAlign: "center", fontWeight: "bold" }}>
        {isPositive ? "Profit" : "Loss"}
      </p>

      <Doughnut data={data} />

      <p style={{ textAlign: "center", marginTop: "10px" }}>
        {value.toFixed(2)}%
      </p>
    </div>
  );
}