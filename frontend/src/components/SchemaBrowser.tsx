import { useState, useEffect } from "react";
import type { Dataset, SchemaTable } from "../lib/types";
import { fetchSchema } from "../lib/api";

interface TableCardProps {
  table: SchemaTable;
}

function TableCard({ table }: TableCardProps) {
  const [open, setOpen] = useState(false);
  const [showSample, setShowSample] = useState(false);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-semibold text-emerald-400">{table.name}</span>
          <span className="text-xs text-white/30">{table.columns.length} cols</span>
        </div>
        <span className="text-white/30 text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-white/10">
          {/* Column list */}
          <div className="px-4 py-3 flex flex-col gap-1.5">
            {table.columns.map((col) => (
              <div key={col.name} className="flex items-center gap-2">
                <span className="text-xs text-white/80 font-mono">{col.name}</span>
                <span className="text-xs text-white/30">{col.type}</span>
              </div>
            ))}
          </div>

          {/* Sample rows toggle */}
          {table.sample_rows.length > 0 && (
            <div className="border-t border-white/10">
              <button
                onClick={() => setShowSample((v) => !v)}
                className="w-full px-4 py-2 text-xs text-white/30 hover:text-white/60 text-left transition cursor-pointer"
              >
                {showSample ? "▲ Hide sample rows" : "▼ Show sample rows"}
              </button>

              {showSample && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-white/5">
                        {table.columns.map((col) => (
                          <th
                            key={col.name}
                            className="text-left px-3 py-1.5 text-white/40 font-medium whitespace-nowrap"
                          >
                            {col.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.sample_rows.map((row, i) => (
                        <tr key={i} className="border-t border-white/5">
                          {table.columns.map((col) => (
                            <td
                              key={col.name}
                              className="px-3 py-1.5 text-white/60 font-mono whitespace-nowrap"
                            >
                              {String(row[col.name] ?? "")}
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
  const [tables, setTables] = useState<SchemaTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setTables([]);
    fetchSchema(dataset)
      .then((res) => setTables(res.tables))
      .catch(() => setError("Could not load schema"))
      .finally(() => setLoading(false));
  }, [dataset]);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 pb-10">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-white/30 font-medium">Browse Schema</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {loading && (
        <div className="text-xs text-white/30 text-center py-4">Loading schema…</div>
      )}

      {error && (
        <div className="text-xs text-red-400 text-center py-4">{error}</div>
      )}

      {!loading && !error && (
        <div className="flex flex-col gap-2">
          {tables.map((table) => (
            <TableCard key={table.name} table={table} />
          ))}
        </div>
      )}
    </div>
  );
}
