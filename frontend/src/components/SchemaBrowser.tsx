import { useState, useEffect } from "react";
import type { Dataset, SchemaTable } from "../lib/types";
import { fetchSchema } from "../lib/api";
import { Search, Table, ChevronDown, ChevronRight, Eye, EyeOff, ExternalLink } from "lucide-react";

interface TableCardProps {
  table: SchemaTable;
  searchQuery: string;
}

const DATASET_SOURCES: Record<Dataset, { label: string; url: string; provider: string }> = {
  chinook: {
    label: "Chinook Database (GitHub)",
    url: "https://github.com/lerocha/chinook-database",
    provider: "GitHub Source"
  },
  imdb: {
    label: "IMDb Movie Dataset (Kaggle)",
    url: "https://www.kaggle.com/datasets/ashirwadsangwan/imdb-dataset",
    provider: "Kaggle Source"
  }
};

// Helper to highlight matched search terms
function HighlightedText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) return <span className="font-mono">{text}</span>;
  
  const escaped = highlight.replace(new RegExp("[-/\\\\^$*+?.()|[\\]{}]", "g"), "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return (
    <span className="font-mono">
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="bg-violet-500/40 text-violet-200 px-0.5 rounded font-semibold font-mono">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

function TableCard({ table, searchQuery }: TableCardProps) {
  const isMatched = searchQuery.trim() !== "" && (
    table.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    table.columns.some(col => col.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  const [open, setOpen] = useState(isMatched);
  const [showSample, setShowSample] = useState(false);

  return (
    <div className="shrink-0 rounded-xl border border-white/5 bg-[#12131a]/60 hover:bg-[#12131a] transition-all overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition cursor-pointer text-left"
      >
        <div className="flex items-center gap-2.5">
          <Table className={`w-3.5 h-3.5 ${open ? 'text-violet-400' : 'text-white/40'}`} />
          <span className="text-xs font-semibold text-white/90">
            <HighlightedText text={table.name} highlight={searchQuery} />
          </span>
          <span className="text-[10px] text-white/30 font-mono bg-white/5 px-1.5 py-0.5 rounded">
            {table.columns.length}
          </span>
        </div>
        <span className="text-white/30 text-xs">
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </span>
      </button>

      {open && (
        <div className="border-t border-white/5 bg-[#0b0c10]/40">
          {/* Column list */}
          <div className="px-3 py-2 flex flex-col gap-1">
            {table.columns.map((col) => {
              const isColMatched = searchQuery.trim() !== "" && col.name.toLowerCase().includes(searchQuery.toLowerCase());
              return (
                <div 
                  key={col.name} 
                  className={`flex items-center justify-between py-1 px-2 rounded transition ${
                    isColMatched ? 'bg-violet-500/10 border-l border-violet-500/45' : 'hover:bg-white/5'
                  }`}
                >
                  <span className="text-xs text-white/80">
                    <HighlightedText text={col.name} highlight={searchQuery} />
                  </span>
                  <span className="text-[9px] text-white/30 font-mono bg-white/5 px-1 py-0.5 rounded uppercase">
                    {col.type}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Sample rows toggle */}
          {table.sample_rows.length > 0 && (
            <div className="border-t border-white/5">
              <button
                onClick={() => setShowSample((v) => !v)}
                className="w-full px-4 py-2 flex items-center gap-1.5 text-[10px] text-white/40 hover:text-white/75 text-left transition cursor-pointer font-medium"
              >
                {showSample ? (
                  <>
                    <EyeOff className="w-3 h-3" /> Hide sample rows
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3" /> Show sample rows
                  </>
                )}
              </button>

              {showSample && (
                <div className="overflow-x-auto border-t border-white/5 bg-[#0b0c10]/80">
                  <table className="w-full text-[10px] text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/5">
                        {table.columns.map((col) => (
                          <th
                            key={col.name}
                            className="px-3 py-1.5 text-white/40 font-semibold whitespace-nowrap"
                          >
                            {col.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.sample_rows.map((row, i) => (
                        <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition">
                          {table.columns.map((col) => (
                            <td
                              key={col.name}
                              className="px-3 py-1.5 text-white/60 font-mono whitespace-nowrap"
                            >
                              {row[col.name] !== null && row[col.name] !== undefined ? String(row[col.name]) : "NULL"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  dataset: Dataset;
}

export default function SchemaBrowser({ dataset }: Props) {
  const [prevDataset, setPrevDataset] = useState(dataset);
  const [tables, setTables] = useState<SchemaTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Adjust state during render if dataset changes
  if (dataset !== prevDataset) {
    setPrevDataset(dataset);
    setTables([]);
    setLoading(true);
    setError(null);
  }

  useEffect(() => {
    let active = true;
    fetchSchema(dataset)
      .then((res) => {
        if (active) {
          setTables(res.tables);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setError("Could not load schema");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [dataset]);

  const filteredTables = tables.filter(table => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    if (table.name.toLowerCase().includes(query)) return true;
    return table.columns.some(col => col.name.toLowerCase().includes(query));
  });

  return (
    <div className="flex flex-col h-full bg-[#0f1015] border-r border-white/10 w-full md:w-80 lg:w-96 select-none">
      {/* Sidebar Header */}
      <div className="px-4 py-3.5 border-b border-white/10 bg-[#0f1015] flex flex-col gap-3">
        <div className="flex items-center gap-2 text-white/70">
          <Table className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-bold uppercase tracking-wider font-heading text-white/80">Database Schema</span>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-white/35" />
          <input
            type="text"
            placeholder="Search tables & columns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-8 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 transition font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2 text-[10px] text-white/30 hover:text-white/60 bg-white/10 hover:bg-white/15 px-1.5 py-0.5 rounded cursor-pointer transition font-sans"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Schema Browser Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 text-xs text-white/30 gap-2">
            <span className="animate-spin text-violet-400">⟳</span>
            Loading database schema…
          </div>
        )}

        {error && (
          <div className="text-xs text-red-400 text-center py-8">{error}</div>
        )}

        {!loading && !error && (
          <>
            {filteredTables.length === 0 ? (
              <div className="text-xs text-white/35 text-center py-8">
                No tables or columns match "{searchQuery}"
              </div>
            ) : (
              filteredTables.map((table) => {
                const isMatched = searchQuery.trim() !== "" && (
                  table.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  table.columns.some(col => col.name.toLowerCase().includes(searchQuery.toLowerCase()))
                );
                return (
                  <TableCard 
                    key={table.name + "_" + (isMatched ? "matched" : "unmatched")} 
                    table={table} 
                    searchQuery={searchQuery} 
                  />
                );
              })
            )}
          </>
        )}
      </div>

      {/* Sidebar Footer: Data Source */}
      <div className="px-4 py-3 bg-[#12131a]/60 border-t border-white/10 flex flex-col gap-1 text-[10px] text-white/30 shrink-0">
        <span className="font-heading font-bold uppercase tracking-wider text-[9px] text-white/40">
          {DATASET_SOURCES[dataset].provider}
        </span>
        <a 
          href={DATASET_SOURCES[dataset].url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors font-medium truncate font-sans"
        >
          <span className="truncate">{DATASET_SOURCES[dataset].label}</span>
          <ExternalLink className="w-3 h-3 shrink-0" />
        </a>
      </div>
    </div>
  );
}
