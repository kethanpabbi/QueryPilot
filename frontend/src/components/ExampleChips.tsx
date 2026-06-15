import type { Dataset } from "../lib/types";
import { Sparkles, ArrowRight, MessageSquareCode } from "lucide-react";

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
    <div className="flex flex-col items-center max-w-2xl mx-auto px-4 py-8 select-none">
      {/* Visual Header / Welcome */}
      <div className="flex flex-col items-center text-center gap-3 mb-8">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-xl shadow-violet-600/20 mb-2 animate-pulse">
          <Sparkles className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
          Query datasets in <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">plain English</span>
        </h1>
        <p className="text-white/40 text-sm max-w-md leading-relaxed">
          Ask questions, and QueryPilot will compile SQL, execute it against the database, and explain the findings.
        </p>
      </div>

      {/* Grid of Examples */}
      <div className="w-full flex flex-col gap-3.5">
        <div className="flex items-center gap-2 text-white/30 text-xs font-bold uppercase tracking-wider pl-1">
          <MessageSquareCode className="w-3.5 h-3.5 text-violet-400" />
          <span>Suggested starting queries</span>
        </div>
        
        <div className="grid grid-cols-1 gap-2.5 w-full">
          {EXAMPLES[dataset].map((ex) => (
            <button
              key={ex}
              onClick={() => onSelect(ex)}
              className="group flex items-center justify-between text-left text-xs px-4 py-3 rounded-xl border border-white/5 bg-[#12131a]/40 text-white/70 hover:text-white hover:bg-[#12131a] hover:border-violet-500/30 transition-all cursor-pointer shadow-sm"
            >
              <span className="font-medium group-hover:translate-x-0.5 transition-transform">{ex}</span>
              <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-violet-400 transition-colors shrink-0 ml-3" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
