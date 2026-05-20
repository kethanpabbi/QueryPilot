interface Props {
  rows: Record<string, unknown>[];
  rowCount: number;
}

export default function ResultsTable({ rows, rowCount }: Props) {
  if (!rows.length) return null;
  const headers = Object.keys(rows[0]);

  return (
    <div className="rounded-lg border border-white/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/5 border-b border-white/10">
              {headers.map((h) => (
                <th
                  key={h}
                  className="text-left px-3 py-2 text-white/50 font-medium whitespace-nowrap"
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
                className="border-b border-white/5 last:border-0 hover:bg-white/5 transition"
              >
                {headers.map((h) => (
                  <td key={h} className="px-3 py-2 text-white/80 whitespace-nowrap font-mono text-xs">
                    {String(row[h] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-1.5 text-xs text-white/30 border-t border-white/5">
        {rowCount} row{rowCount !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
