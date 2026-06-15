import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { Send, CornerDownLeft } from "lucide-react";

interface Props {
  onSubmit: (question: string) => void;
  disabled: boolean;
}

export default function InputBar({ onSubmit, disabled }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
  }, [value]);

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
    <div className="px-6 pb-6 pt-3 border-t border-[#4a4e8f]/20 bg-[#1a1228]/90 backdrop-blur-md">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2 bg-[#2b1e3e]/80 border border-[#4a4e8f]/20 rounded-2xl px-4 py-2.5 focus-within:border-[#a490c2]/60 focus-within:ring-2 focus-within:ring-[#a490c2]/20 transition-all shadow-xl shadow-black/10">
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask anything about the dataset…"
            disabled={disabled}
            className="flex-1 bg-transparent resize-none text-sm text-[#e6e6fa] placeholder-[#e6e6fa]/30 focus:outline-none py-1 max-h-32 disabled:opacity-40 font-normal leading-relaxed"
            style={{ height: "24px" }}
          />
          <button
            onClick={submit}
            disabled={disabled || !value.trim()}
            className="shrink-0 flex items-center justify-center bg-[#4a4e8f] hover:bg-[#5a5ea5] disabled:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-[#e6e6fa] p-2 rounded-xl transition cursor-pointer shadow-lg shadow-[#4a4e8f]/10 hover:shadow-[#4a4e8f]/25"
            title="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-center gap-1 text-[10px] text-[#e6e6fa]/20 mt-2">
          <span>Enter to send</span>
          <CornerDownLeft className="w-2.5 h-2.5" />
          <span className="mx-1.5">·</span>
          <span>Shift+Enter for newline</span>
        </div>
      </div>
    </div>
  );
}
