import { Table } from "lucide-react";

interface Props {
  rows: Record<string, unknown>[];
  rowCount: number;
}

export default function ResultsTable({ rows, rowCount }: Props) {
  if (!rows.length) return null;
  const headers = Object.keys(rows[0]);

  return (
    <div className="rounded-xl border border-[#4a4e8f]/20 bg-[#2b1e3e]/40 overflow-hidden flex flex-col">
      {/* Table Header */}
      <div className="px-4 py-2 bg-[#2b1e3e]/80 border-b border-[#4a4e8f]/20 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[#e6e6fa]/70">
          <Table className="w-3.5 h-3.5 text-[#a490c2]" />
          <span className="text-xs font-bold tracking-wider uppercase select-none font-heading">Query Results</span>
        </div>
        <div className="text-[10px] text-[#e6e6fa]/40 font-mono bg-white/5 px-2 py-0.5 rounded">
          {rowCount} row{rowCount !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Table grid */}
      <div className="overflow-auto max-h-80 select-text">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#321f47] border-b border-[#4a4e8f]/20">
              {headers.map((h) => (
                <th
                  key={h}
                  className="sticky top-0 bg-[#321f47] z-10 px-4 py-2.5 text-xs text-[#e6e6fa]/50 font-semibold uppercase tracking-wider font-mono whitespace-nowrap border-b border-[#4a4e8f]/20"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-[#4a4e8f]/10 last:border-0 hover:bg-white/5 transition odd:bg-[#2b1e3e]/10 even:bg-[#321f47]/10"
              >
                {headers.map((h) => {
                  const val = row[h];
                  const isNull = val === null || val === undefined;
                  return (
                    <td
                      key={h}
                      className={`px-4 py-2.5 whitespace-nowrap font-mono text-xs border-r border-[#4a4e8f]/10 last:border-r-0 ${
                        isNull ? "text-[#e6e6fa]/20 italic" : "text-[#e6e6fa]/80"
                      }`}
                    >
                      {isNull ? "NULL" : String(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
