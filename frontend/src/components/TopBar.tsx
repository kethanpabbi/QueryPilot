import { useState, useEffect } from "react";
import type { Dataset } from "../lib/types";
import { Database, Trash2, Menu, Sparkles, ChevronDown } from "lucide-react";

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
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDropdownOpen((v) => !v);
  };

  useEffect(() => {
    if (!dropdownOpen) return;
    const close = () => setDropdownOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [dropdownOpen]);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-5 py-3 border-b border-[#4a4e8f]/30 bg-[#231938]/80 backdrop-blur-md">
      <div className="flex items-center gap-3">
        {/* Sidebar Toggle Button */}
        <button
          onClick={onToggleSidebar}
          title={sidebarOpen ? "Hide schema browser" : "Show schema browser"}
          className={`p-2 rounded-lg border transition cursor-pointer hover:bg-[#a490c2]/5 ${
            sidebarOpen
              ? "bg-[#a490c2]/10 border-[#a490c2]/30 text-[#a490c2]"
              : "border-white/10 text-white/60 hover:text-[#e6e6fa]"
          }`}
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2.5 select-none">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-[#4a4e8f] to-[#a490c2] text-white shadow-lg shadow-[#4a4e8f]/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black font-heading text-[#e6e6fa] tracking-widest leading-none uppercase">QueryPilot</span>
            <span className="text-[9px] text-[#e6e6fa]/30 font-mono mt-0.5 tracking-wider">NL → SQL AGENT</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Dataset Custom Dropdown Picker */}
        <div className="relative">
          <button
            onClick={toggleDropdown}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider font-heading bg-gradient-to-r from-[#4a4e8f] to-[#3d4080] hover:from-[#5a5ea5] hover:to-[#4a4e8f] text-[#e6e6fa] shadow-lg shadow-[#4a4e8f]/25 border border-[#a490c2]/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer select-none"
          >
            <Database className="w-3.5 h-3.5" />
            <span>{dataset === "chinook" ? "🎵 Chinook" : "🎬 IMDB"}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#231938] border border-[#4a4e8f]/30 p-2 shadow-2xl z-50 animate-in fade-in-50 slide-in-from-top-1 duration-150"
            >
              <div className="px-2.5 py-1.5 text-[9px] font-bold text-[#e6e6fa]/30 uppercase tracking-wider font-heading">
                Select Active Dataset
              </div>
              <div className="flex flex-col gap-1 mt-1">
                {DATASETS.map((d) => {
                  const isSelected = d.value === dataset;
                  return (
                    <button
                      key={d.value}
                      onClick={() => {
                        onDatasetChange(d.value);
                        setDropdownOpen(false);
                      }}
                      className={`flex items-center justify-between w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer font-sans ${
                        isSelected
                          ? "bg-[#4a4e8f] text-[#e6e6fa] shadow-lg shadow-[#4a4e8f]/10"
                          : "text-[#e6e6fa]/60 hover:text-[#e6e6fa] hover:bg-white/5"
                      }`}
                    >
                      <span>{d.label}</span>
                      {isSelected && (
                        <span className="text-[9px] bg-white/15 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider text-[#e6e6fa]">
                          Active
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Clear Thread Button */}
        {hasMessages && (
          <button
            onClick={onClearChat}
            title="Clear Chat Thread"
            className="flex items-center gap-1.5 text-xs border border-white/10 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 text-[#e6e6fa]/60 rounded-xl px-3.5 py-2 transition cursor-pointer font-medium"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
      </div>
    </header>
  );
}
