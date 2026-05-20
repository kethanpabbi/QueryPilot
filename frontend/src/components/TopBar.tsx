import type { Dataset, Model } from "../lib/types";

interface Props {
  dataset: Dataset;
  model: Model;
  onDatasetChange: (d: Dataset) => void;
  onModelChange: (m: Model) => void;
}

const DATASETS: { value: Dataset; label: string }[] = [
  { value: "nyc_taxi", label: "🚕 NYC Taxi" },
  { value: "ecommerce", label: "🛒 E-commerce" },
];

const MODELS: { value: Model; label: string }[] = [
  { value: "claude", label: "Claude" },
  { value: "openai", label: "OpenAI" },
];

export default function TopBar({ dataset, model, onDatasetChange, onModelChange }: Props) {
  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-[#16161e]">
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-white tracking-tight">QueryPilot</span>
        <span className="text-xs text-white/30 font-mono">NL → SQL</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Dataset picker */}
        <select
          value={dataset}
          onChange={(e) => onDatasetChange(e.target.value as Dataset)}
          className="text-sm bg-white/5 border border-white/10 text-white rounded-lg px-3 py-1.5 cursor-pointer hover:bg-white/10 transition focus:outline-none focus:ring-1 focus:ring-violet-500"
        >
          {DATASETS.map((d) => (
            <option key={d.value} value={d.value} className="bg-[#1e1e2e]">
              {d.label}
            </option>
          ))}
        </select>

        {/* Model picker */}
        <select
          value={model}
          onChange={(e) => onModelChange(e.target.value as Model)}
          className="text-sm bg-white/5 border border-white/10 text-white rounded-lg px-3 py-1.5 cursor-pointer hover:bg-white/10 transition focus:outline-none focus:ring-1 focus:ring-violet-500"
        >
          {MODELS.map((m) => (
            <option key={m.value} value={m.value} className="bg-[#1e1e2e]">
              {m.label}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
