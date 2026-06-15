import type { Dataset } from "../lib/types";
import { Database, Trash2, Menu, Sparkles } from "lucide-react";

interface Props {
  dataset: Dataset;
  onDatasetChange: (d: Dataset) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onClearChat: () => void;
  hasMessages: boolean;
}

const DATASETS: { value: Dataset; label: string }[] = [
  { value: "chinook", label: "🎵 Chinook" },
  { value: "imdb",    label: "🎬 IMDB" },
];

export default function TopBar({
  dataset,
  onDatasetChange,
  sidebarOpen,
  onToggleSidebar,
  onClearChat,
  hasMessages,
}: Props) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-5 py-3 border-b border-white/10 bg-[#0f1015]/80 backdrop-blur-md">
      <div className="flex items-center gap-3">
        {/* Sidebar Toggle Button */}
        <button
          onClick={onToggleSidebar}
          title={sidebarOpen ? "Hide schema browser" : "Show schema browser"}
          className={`p-2 rounded-lg border transition cursor-pointer hover:bg-white/5 ${
            sidebarOpen
              ? "bg-violet-500/10 border-violet-500/30 text-violet-400"
              : "border-white/10 text-white/60 hover:text-white"
          }`}
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2 select-none">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-lg shadow-violet-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white tracking-tight leading-none">QueryPilot</span>
            <span className="text-[10px] text-white/40 font-mono mt-0.5">NL → SQL AGENT</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Dataset picker */}
        <div className="relative flex items-center">
          <Database className="absolute left-3 w-3.5 h-3.5 text-white/40 pointer-events-none" />
          <select
            value={dataset}
            onChange={(e) => onDatasetChange(e.target.value as Dataset)}
            className="text-xs bg-white/5 border border-white/10 text-white rounded-lg pl-9 pr-3 py-2 cursor-pointer hover:bg-white/10 transition focus:outline-none focus:ring-1 focus:ring-violet-500 font-medium appearance-none"
          >
            {DATASETS.map((d) => (
              <option key={d.value} value={d.value} className="bg-[#0f1015] text-white">
                {d.label}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Thread Button */}
        {hasMessages && (
          <button
            onClick={onClearChat}
            title="Clear Chat Thread"
            className="flex items-center gap-1.5 text-xs border border-white/10 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 text-white/60 rounded-lg px-3 py-2 transition cursor-pointer font-medium"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
      </div>
    </header>
  );
}

