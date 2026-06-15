import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Message } from "../lib/types";
import GuardrailBadge from "./GuardrailBadge";
import ResultsTable from "./ResultsTable";
import { Copy, Check, Sparkles, Terminal, ArrowRight } from "lucide-react";

interface Props {
  message: Message;
  onFollowUp: (q: string) => void;
}

function normalizeMarkdown(text: string): string {
  if (!text) return "";
  return text
    .replace(/\*\*\s+/g, "**")
    .replace(/\s+\*\*/g, "**")
    .replace(/(\d),\s+(\d)/g, "$1,$2")
    .replace(/\s+([,.;:!?%])/g, "$1")
    .replace(/(\w)\s+-(\w)/g, "$1-$2");
}

function HighlightedSql({ sql }: { sql: string }) {
  const tokens: { type: 'keyword' | 'string' | 'number' | 'comment' | 'text'; value: string }[] = [];

  const keywords = new Set([
    "SELECT", "FROM", "WHERE", "JOIN", "LEFT", "RIGHT", "INNER", "OUTER", "ON",
    "GROUP BY", "ORDER BY", "LIMIT", "AND", "OR", "AS", "IN", "IS", "NULL",
    "COUNT", "AVG", "SUM", "MIN", "MAX", "HAVING", "WITH", "UNION", "BY", "ORDER", "GROUP"
  ]);

  const tokenRegex = /('(?:''|[^'])*'|--.*$|\b\d+\b|[a-zA-Z_][a-zA-Z0-9_]*|[^\w\s']+|\s+)/gm;

  let match;
  while ((match = tokenRegex.exec(sql)) !== null) {
    const value = match[0];
    if (value.startsWith("'")) {
      tokens.push({ type: 'string', value });
    } else if (value.startsWith("--")) {
      tokens.push({ type: 'comment', value });
    } else if (/^\d+$/.test(value)) {
      tokens.push({ type: 'number', value });
    } else if (keywords.has(value.toUpperCase())) {
      tokens.push({ type: 'keyword', value });
    } else {
      tokens.push({ type: 'text', value });
    }
  }

  return (
    <code className="block px-4 pb-4 text-xs font-mono overflow-x-auto whitespace-pre leading-relaxed select-text">
      {tokens.map((token, index) => {
        switch (token.type) {
          case 'keyword':
            return <span key={index} className="text-[#a490c2] font-semibold">{token.value.toUpperCase()}</span>;
          case 'string':
            return <span key={index} className="text-amber-300 font-medium">{token.value}</span>;
          case 'number':
            return <span key={index} className="text-cyan-400">{token.value}</span>;
          case 'comment':
            return <span key={index} className="text-slate-500 italic">{token.value}</span>;
          default:
            return <span key={index} className="text-[#e6e6fa]/70">{token.value}</span>;
        }
      })}
    </code>
  );
}

export default function ResultCard({ message, onFollowUp }: Props) {
  const [showSql, setShowSql] = useState(false);
  const [copied, setCopied] = useState(false);
  const { result, explanation, followUps, loading, explaining } = message;

  const handleCopySql = () => {
    if (!result?.sql) return;
    navigator.clipboard.writeText(result.sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4 select-none">
      {/* User question bubble */}
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-gradient-to-r from-[#4a4e8f] to-[#3d4080] text-[#e6e6fa] rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm font-medium shadow-lg shadow-[#4a4e8f]/10 select-text">
          {message.question}
        </div>
      </div>

      {/* Assistant response zone */}
      <div className="max-w-full flex flex-col gap-4 border-l-2 border-[#4a4e8f]/20 pl-4 sm:pl-5">
        {/* Agent header tag */}
        <div className="flex items-center gap-1.5 text-[10px] text-[#e6e6fa]/40 font-bold uppercase tracking-wider font-heading">
          <Terminal className="w-3.5 h-3.5 text-[#a490c2]" />
          <span>QueryPilot Response</span>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="rounded-2xl border border-[#4a4e8f]/20 bg-[#2b1e3e]/60 px-5 py-4 shadow-xl">
            <div className="flex items-center gap-3 text-[#e6e6fa]/50 text-sm">
              <span className="animate-spin text-[#a490c2] text-lg">⟳</span>
              <span className="font-medium">Synthesizing SQL query and searching database…</span>
            </div>
          </div>
        )}

        {result && (
          <>
            {result.error_code && result.error && (
              <GuardrailBadge code={result.error_code} message={result.error} />
            )}

            {result.error && !result.error_code && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300 leading-relaxed select-text">
                <span className="font-bold block text-red-400 mb-1">⚠️ Database Error</span>
                {result.error}
              </div>
            )}

            {/* SQL block */}
            {result.sql && (
              <div className="rounded-xl border border-[#4a4e8f]/20 bg-[#1e1530] overflow-hidden shadow-lg shadow-black/20">
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#2b1e3e]/80 border-b border-[#4a4e8f]/20">
                  <button
                    onClick={() => setShowSql((v) => !v)}
                    className="flex items-center gap-1.5 text-xs font-mono text-[#e6e6fa]/45 hover:text-[#e6e6fa]/70 transition cursor-pointer"
                  >
                    <span>{showSql ? "▼" : "▶"}</span>
                    <span>SQL QUERY</span>
                  </button>
                  {showSql && (
                    <button
                      onClick={handleCopySql}
                      className="flex items-center gap-1 text-[10px] text-[#e6e6fa]/40 hover:text-[#e6e6fa]/80 bg-white/5 border border-white/5 hover:bg-white/10 px-2 py-1 rounded transition cursor-pointer"
                      title="Copy SQL to Clipboard"
                    >
                      {copied ? (
                        <><Check className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400 font-medium">Copied</span></>
                      ) : (
                        <><Copy className="w-3 h-3" /><span>Copy</span></>
                      )}
                    </button>
                  )}
                </div>
                {showSql && (
                  <div className="mt-3">
                    <HighlightedSql sql={result.sql} />
                  </div>
                )}
              </div>
            )}

            {/* Results table */}
            {result.rows.length > 0 && (
              <div className="shadow-lg">
                <ResultsTable rows={result.rows} rowCount={result.row_count} />
              </div>
            )}

            {/* Explanation card */}
            {(explaining || explanation) && (
              <div className="rounded-xl border border-[#a490c2]/15 bg-[#a490c2]/5 px-5 py-4 shadow-md shadow-[#a490c2]/5 flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-xs text-[#a490c2] font-extrabold uppercase tracking-wider select-none font-heading">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Explanation</span>
                </div>
                <div className="text-sm text-[#e6e6fa]/85 leading-relaxed select-text">
                  <div className="prose prose-invert prose-sm max-w-none
                    prose-strong:text-[#e6e6fa] prose-strong:font-semibold
                    prose-em:text-[#e6e6fa]/95 prose-em:italic
                    prose-code:text-emerald-300 prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                    prose-p:my-2 prose-p:leading-relaxed
                    prose-ul:list-disc prose-ul:pl-5 prose-ul:my-2
                    prose-ol:list-decimal prose-ol:pl-5 prose-ol:my-2
                    prose-li:my-1">
                    <ReactMarkdown>
                      {normalizeMarkdown(explanation) + (explaining ? " █" : "")}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            {/* Follow-up chips */}
            {followUps.length > 0 && (
              <div className="flex flex-col gap-2.5 mt-1 select-none">
                <p className="text-[10px] text-[#e6e6fa]/30 font-bold uppercase tracking-wider font-heading">Suggested Queries</p>
                <div className="flex flex-wrap gap-2">
                  {followUps.map((q) => (
                    <button
                      key={q}
                      onClick={() => onFollowUp(q)}
                      className="text-xs px-4 py-2 rounded-full border border-[#4a4e8f]/20 bg-white/5 text-[#e6e6fa]/60 hover:bg-[#4a4e8f]/10 hover:border-[#4a4e8f]/35 hover:text-[#e6e6fa] transition-all cursor-pointer font-medium hover:scale-[1.02] flex items-center gap-1.5 shadow-sm"
                    >
                      <span>{q}</span>
                      <ArrowRight className="w-3 h-3 text-[#e6e6fa]/30" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
