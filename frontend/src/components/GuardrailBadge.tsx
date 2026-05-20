const LABELS: Record<string, string> = {
  BLOCKED_STATEMENT: "Blocked Statement",
  INVALID_TABLE: "Invalid Table",
  PARSE_ERROR: "Parse Error",
  UNANSWERABLE: "Not in Dataset",
  EMPTY_SQL: "No Query Generated",
};

const STYLES: Record<string, { border: string; bg: string; text: string; chip: string; icon: string }> = {
  UNANSWERABLE: {
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
    text: "text-amber-300/80",
    chip: "text-amber-400 bg-amber-500/20",
    icon: "ℹ️",
  },
  EMPTY_SQL: {
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
    text: "text-amber-300/80",
    chip: "text-amber-400 bg-amber-500/20",
    icon: "ℹ️",
  },
};

const DEFAULT_STYLE = {
  border: "border-red-500/30",
  bg: "bg-red-500/10",
  text: "text-red-300/80",
  chip: "text-red-400 bg-red-500/20",
  icon: "🚫",
};

interface Props {
  code: string;
  message: string;
}

export default function GuardrailBadge({ code, message }: Props) {
  const style = STYLES[code] ?? DEFAULT_STYLE;
  return (
    <div className={`rounded-lg border ${style.border} ${style.bg} p-3`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${style.chip} px-2 py-0.5 rounded-full`}>
          {style.icon} {LABELS[code] ?? code}
        </span>
      </div>
      <p className={`text-sm ${style.text}`}>{message}</p>
    </div>
  );
}
