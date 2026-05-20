const LABELS: Record<string, string> = {
  BLOCKED_STATEMENT: "Blocked Statement",
  INVALID_TABLE: "Invalid Table",
  PARSE_ERROR: "Parse Error",
};

interface Props {
  code: string;
  message: string;
}

export default function GuardrailBadge({ code, message }: Props) {
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">
          🚫 {LABELS[code] ?? code}
        </span>
      </div>
      <p className="text-sm text-red-300/80">{message}</p>
    </div>
  );
}
