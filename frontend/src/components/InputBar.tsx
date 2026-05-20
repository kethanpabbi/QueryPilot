import { useState, type KeyboardEvent } from "react";

interface Props {
  onSubmit: (question: string) => void;
  disabled: boolean;
}

export default function InputBar({ onSubmit, disabled }: Props) {
  const [value, setValue] = useState("");

  const submit = () => {
    const q = value.trim();
    if (!q || disabled) return;
    onSubmit(q);
    setValue("");
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="px-4 pb-4 pt-2 border-t border-white/10 bg-[#16161e]">
      <div className="flex items-end gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus-within:border-violet-500/50 transition">
        <textarea
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask anything about the dataset…"
          disabled={disabled}
          className="flex-1 bg-transparent resize-none text-sm text-white placeholder-white/25 focus:outline-none py-1.5 max-h-32 disabled:opacity-40"
          style={{ lineHeight: "1.5" }}
        />
        <button
          onClick={submit}
          disabled={disabled || !value.trim()}
          className="shrink-0 bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-1.5 rounded-lg transition cursor-pointer"
        >
          Send
        </button>
      </div>
      <p className="text-center text-xs text-white/20 mt-1.5">
        Enter to send · Shift+Enter for newline
      </p>
    </div>
  );
}
