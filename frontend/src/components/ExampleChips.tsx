import type { Dataset } from "../lib/types";

const EXAMPLES: Record<Dataset, string[]> = {
  nyc_taxi: [
    "What is the average fare amount?",
    "Top 5 pickup locations by trip count",
    "Average tip percentage by payment type",
    "How many trips were taken each hour of the day?",
    "Which vendor has the most trips?",
  ],
  ecommerce: [
    "How many orders are there in total?",
    "What is the average order value?",
    "Top 5 products by revenue",
    "How many orders were placed each month?",
    "What percentage of orders were delivered on time?",
  ],
};

interface Props {
  dataset: Dataset;
  onSelect: (q: string) => void;
}

export default function ExampleChips({ dataset, onSelect }: Props) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-6 px-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-1">Ask anything about the data</h2>
        <p className="text-white/40 text-sm">
          Select a dataset above, then type a question or pick an example
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
        {EXAMPLES[dataset].map((ex) => (
          <button
            key={ex}
            onClick={() => onSelect(ex)}
            className="text-sm px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-violet-500/20 hover:border-violet-500/50 hover:text-white transition cursor-pointer"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
