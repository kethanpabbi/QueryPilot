import { useState, useRef, useEffect } from "react";
import type { Dataset, Model, Message } from "./lib/types";
import { runQuery, streamExplanation } from "./lib/api";
import TopBar from "./components/TopBar";
import ExampleChips from "./components/ExampleChips";
import ResultCard from "./components/ResultCard";
import InputBar from "./components/InputBar";

export default function App() {
  const [dataset, setDataset] = useState<Dataset>("nyc_taxi");
  const [model, setModel] = useState<Model>("claude");
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const updateMessage = (id: string, patch: Partial<Message>) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
    );
  };

  const handleQuestion = async (question: string) => {
    if (busy) return;
    setBusy(true);

    const id = crypto.randomUUID();
    const newMessage: Message = {
      id,
      question,
      result: null,
      explanation: "",
      followUps: [],
      loading: true,
      explaining: false,
    };

    setMessages((prev) => [...prev, newMessage]);

    try {
      // Step 1: run the SQL agent
      const result = await runQuery(question, dataset, model);
      updateMessage(id, { result, loading: false });

      // Step 2: only stream explanation if we got actual rows back
      if (result.rows.length > 0 && !result.error) {
        updateMessage(id, { explaining: true });
        await streamExplanation(
          question,
          result.sql,
          result.rows,
          model,
          (token) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === id ? { ...m, explanation: m.explanation + token } : m
              )
            );
          },
          (followUps) => updateMessage(id, { followUps }),
          () => updateMessage(id, { explaining: false })
        );
      } else {
        updateMessage(id, { loading: false });
      }
    } catch (err) {
      updateMessage(id, {
        loading: false,
        explaining: false,
        result: {
          question,
          sql: "",
          rows: [],
          row_count: 0,
          error: err instanceof Error ? err.message : "Something went wrong",
          error_code: null,
        },
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0f0f13] text-white">
      <TopBar
        dataset={dataset}
        model={model}
        onDatasetChange={(d) => { setDataset(d); setMessages([]); }}
        onModelChange={setModel}
      />

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <ExampleChips dataset={dataset} onSelect={handleQuestion} />
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-8">
            {messages.map((msg) => (
              <ResultCard
                key={msg.id}
                message={msg}
                onFollowUp={handleQuestion}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <InputBar onSubmit={handleQuestion} disabled={busy} />
    </div>
  );
}
