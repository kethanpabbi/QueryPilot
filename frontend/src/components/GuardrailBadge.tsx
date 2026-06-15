import { AlertOctagon, Info, AlertTriangle } from "lucide-react";

const LABELS: Record<string, string> = {
  BLOCKED_STATEMENT: "Blocked Statement",
  INVALID_TABLE: "Invalid Table",
  PARSE_ERROR: "Parse Error",
  UNANSWERABLE: "Not in Dataset",
  EMPTY_SQL: "No Query Generated",
};

interface BadgeStyle {
  border: string;
  bg: string;
  text: string;
  iconColor: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STYLES: Record<string, BadgeStyle> = {
  UNANSWERABLE: {
    border: "border-amber-500/20",
    bg: "bg-amber-500/5",
    text: "text-amber-300/90",
    iconColor: "text-amber-400",
    icon: Info,
  },
  EMPTY_SQL: {
    border: "border-amber-500/20",
    bg: "bg-amber-500/5",
    text: "text-amber-300/90",
    iconColor: "text-amber-400",
    icon: AlertTriangle,
  },
};

const DEFAULT_STYLE: BadgeStyle = {
  border: "border-red-500/25",
  bg: "bg-red-500/5",
  text: "text-red-300/90",
  iconColor: "text-red-400",
  icon: AlertOctagon,
};

interface Props {
  code: string;
  message: string;
}

export default function GuardrailBadge({ code, message }: Props) {
  const style = STYLES[code] ?? DEFAULT_STYLE;
  const IconComponent = style.icon;

  return (
    <div className={`rounded-xl border ${style.border} ${style.bg} p-4 flex gap-3 shadow-lg backdrop-blur-sm select-text`}>
      <div className={`shrink-0 ${style.iconColor} mt-0.5`}>
        <IconComponent className="w-5 h-5" />
      </div>
      <div className="flex flex-col gap-1">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${style.iconColor}`}>
          {LABELS[code] ?? code}
        </span>
        <p className={`text-sm font-normal leading-relaxed ${style.text}`}>{message}</p>
      </div>
    </div>
  );
}
