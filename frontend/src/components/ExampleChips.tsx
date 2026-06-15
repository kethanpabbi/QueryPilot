import type { Dataset } from "../lib/types";

const EXAMPLES: Record<Dataset, string[]> = {
  chinook: [
    "Which artist has the most albums?",
    "Top 5 genres by number of tracks",
    "Which customer has spent the most overall?",
    "Average invoice total by billing country",
    "How many tracks are in each playlist?",
  ],
  imdb: [
    "Top 10 highest rated movies with at least 100k votes",
    "Which genre has the most movies?",
    "Average rating by decade",
    "Longest movies over 3 hours",
    "Movies from the 1990s rated above 8.0",
  ],
};

interface Props {
  dataset: Dataset;
  onSelect: (q: string) => void;
}

export default function ExampleChips({ dataset, onSelect }: Props) {
  return (
    <div className="text-center flex flex-col items-center gap-4">
      <div>
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
