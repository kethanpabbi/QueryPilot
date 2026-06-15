import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { Send, CornerDownLeft } from "lucide-react";

interface Props {
  onSubmit: (question: string) => void;
  disabled: boolean;
}

export default function InputBar({ onSubmit, disabled }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea height based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Reset height to calculate scrollHeight correctly
    textarea.style.height = "auto";
    // Set height matching the content, up to max-height limit in CSS (max-h-32)
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
    <div className="px-6 pb-6 pt-3 border-t border-white/5 bg-[#0b0c10]/90 backdrop-blur-md">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2 bg-[#12131a]/80 border border-white/10 rounded-2xl px-4 py-2.5 focus-within:border-violet-500/60 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all shadow-xl shadow-black/10">
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask anything about the dataset…"
            disabled={disabled}
            className="flex-1 bg-transparent resize-none text-sm text-white placeholder-white/30 focus:outline-none py-1 max-h-32 disabled:opacity-40 font-normal leading-relaxed"
            style={{ height: "24px" }}
          />
          <button
            onClick={submit}
            disabled={disabled || !value.trim()}
            className="shrink-0 flex items-center justify-center bg-violet-600 hover:bg-violet-500 disabled:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-white p-2 rounded-xl transition cursor-pointer shadow-lg shadow-violet-600/10 hover:shadow-violet-600/25"
            title="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-center gap-1 text-[10px] text-white/20 mt-2">
          <span>Enter to send</span>
          <CornerDownLeft className="w-2.5 h-2.5" />
          <span className="mx-1.5">·</span>
          <span>Shift+Enter for newline</span>
        </div>
      </div>
    </div>
  );
}
