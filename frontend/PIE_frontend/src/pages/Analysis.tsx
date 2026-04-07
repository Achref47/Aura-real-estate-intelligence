import PropertyForm from "../components/PropertyForm";

export default function Analysis({ setResult }: any) {
  return (
    <div className="analysis-page">
      <h1>📊 Property Analysis</h1>

      <PropertyForm setResult={setResult} />
    </div>
  );
}