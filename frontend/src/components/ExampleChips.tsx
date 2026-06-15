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
      <div className="flex flex-col items-center text-center gap-4 mb-10">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#4a4e8f] to-[#a490c2] text-white shadow-xl shadow-[#4a4e8f]/20 mb-2 animate-pulse">
          <Sparkles className="w-6 h-6" />
        </div>
        <h1 className="text-4xl font-black font-heading text-[#e6e6fa] tracking-tight sm:text-5xl md:text-6xl leading-[1.15]">
          Query datasets in <span className="bg-gradient-to-r from-[#a490c2] to-[#7b82c8] bg-clip-text text-transparent">plain English</span>
        </h1>
        <p className="text-[#e6e6fa]/40 text-sm sm:text-base max-w-lg leading-relaxed font-sans">
          Ask questions, and QueryPilot will compile SQL, execute it against the database, and explain the findings.
        </p>
      </div>

      {/* Grid of Examples */}
      <div className="w-full flex flex-col gap-3.5">
        <div className="flex items-center gap-2 text-[#e6e6fa]/30 text-[10px] font-bold uppercase tracking-wider pl-1 font-heading">
          <MessageSquareCode className="w-3.5 h-3.5 text-[#a490c2]" />
          <span>Suggested starting queries</span>
        </div>

        <div className="grid grid-cols-1 gap-2.5 w-full">
          {EXAMPLES[dataset].map((ex) => (
            <button
              key={ex}
              onClick={() => onSelect(ex)}
              className="group flex items-center justify-between text-left text-xs px-4 py-3 rounded-xl border border-[#4a4e8f]/20 bg-[#2b1e3e]/40 text-[#e6e6fa]/70 hover:text-[#e6e6fa] hover:bg-[#2b1e3e] hover:border-[#a490c2]/30 transition-all cursor-pointer shadow-sm"
            >
              <span className="font-medium group-hover:translate-x-0.5 transition-transform">{ex}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#e6e6fa]/20 group-hover:text-[#a490c2] transition-colors shrink-0 ml-3" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
