export default function AIExplanation({ result }: any) {

  const generateExplanation = () => {
    const roi = result.roi;
    const aircs = result.aircs;
    const pred = result.pred_price;
    const price = result.input_price || 0;

    let text = "";

    // ROI
    if (roi > 0.1) {
      text += `This property offers strong profitability (ROI: ${(roi * 100).toFixed(1)}%). `;
    } else if (roi > 0.03) {
      text += `This property shows moderate return potential. `;
    } else {
      text += `This investment has low or negative returns. `;
    }

    // Risk
    if (aircs < 0.35) {
      text += `It carries high risk due to condition and aging factors. `;
    } else if (aircs < 0.6) {
      text += `Risk level is moderate. `;
    } else {
      text += `This is a low-risk property. `;
    }

    // Price difference
    const diff = pred - price;

if (diff > 0) {
  text += `The property appears undervalued by $${Math.abs(diff).toFixed(0)}. `;
} else {
  text += `The property appears overpriced by $${Math.abs(diff).toFixed(0)}. `;
}

    // Decision
    if (result.decision === "BUY") {
      text += `Overall, this is a strong investment opportunity.`;
    } else if (result.decision === "HOLD") {
      text += `This investment could be viable with negotiation or improvements.`;
    } else {
      text += `Overall, this investment is not recommended.`;
    }

    return text;
  };

  return (
    <div className="explanation-card">
      <h3>🧠 AI Investment Insight</h3>
      <p>{generateExplanation()}</p>
    </div>
  );
}