import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Message } from "../lib/types";
import GuardrailBadge from "./GuardrailBadge";
import ResultsTable from "./ResultsTable";

interface Props {
  message: Message;
  onFollowUp: (q: string) => void;
}

export default function ResultCard({ message, onFollowUp }: Props) {
  const [showSql, setShowSql] = useState(false);
  const { result, explanation, followUps, loading, explaining } = message;

  return (
    <div className="flex flex-col gap-3">
      {/* User question */}
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-violet-600 text-white rounded-2xl rounded-tr-sm px-4 py-2 text-sm">
          {message.question}
        </div>
      </div>

      {/* Response card */}
      <div className="max-w-[90%] flex flex-col gap-3">

        {/* Loading skeleton */}
        {loading && (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="flex items-center gap-2 text-white/40 text-sm">
              <span className="animate-spin">⟳</span>
              Generating SQL…
            </div>
          </div>
        )}

        {result && (
          <>
            {/* Guardrail error */}
            {result.error_code && result.error && (
              <GuardrailBadge code={result.error_code} message={result.error} />
            )}

            {/* SQL execution error (not a guardrail) */}
            {result.error && !result.error_code && (
              <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-sm text-orange-300">
                ⚠️ {result.error}
              </div>
            )}

            {/* SQL block */}
            {result.sql && (
              <div className="rounded-xl border border-white/10 bg-[#1a1a24] overflow-hidden">
                <button
                  onClick={() => setShowSql((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-white/40 hover:text-white/70 transition cursor-pointer"
                >
                  <span className="font-mono">SQL</span>
                  <span>{showSql ? "▲ Hide" : "▼ View"}</span>
                </button>
                {showSql && (
                  <pre className="px-4 pb-4 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                    {result.sql}
                  </pre>
                )}
              </div>
            )}

            {/* Results table */}
            {result.rows.length > 0 && (
              <ResultsTable rows={result.rows} rowCount={result.row_count} />
            )}

            {/* Explanation */}
            {(explaining || explanation) && (
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3">
                <p className="text-xs text-violet-400 font-medium mb-1">💡 Explanation</p>
                <div className="text-sm text-white/80 leading-relaxed">
                  {explaining ? (
                    // Plain text while streaming — markdown is incomplete mid-stream
                    <p className="whitespace-pre-wrap break-words">
                      {explanation}
                      <span className="inline-block w-0.5 h-3.5 bg-violet-400 ml-0.5 animate-pulse align-middle" />
                    </p>
                  ) : (
                    // Full markdown render once streaming is done
                    <div className="prose prose-invert prose-sm max-w-none
                      prose-strong:text-white prose-code:text-emerald-300 prose-code:bg-white/10
                      prose-code:px-1 prose-code:rounded prose-p:my-0">
                      <ReactMarkdown>{explanation}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Follow-up chips */}
            {followUps.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs text-white/30">Follow-up questions</p>
                <div className="flex flex-wrap gap-2">
                  {followUps.map((q) => (
                    <button
                      key={q}
                      onClick={() => onFollowUp(q)}
                      className="text-xs px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/60 hover:bg-violet-500/20 hover:border-violet-500/40 hover:text-white transition cursor-pointer"
                    >
                      {q}
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
