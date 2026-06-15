import { useState, useRef, useEffect } from "react";
import type { Dataset, Message } from "./lib/types";
import { runQuery, streamExplanation } from "./lib/api";
import TopBar from "./components/TopBar";
import ExampleChips from "./components/ExampleChips";
import SchemaBrowser from "./components/SchemaBrowser";
import ResultCard from "./components/ResultCard";
import InputBar from "./components/InputBar";

export default function App() {
  const [dataset, setDataset] = useState<Dataset>("chinook");
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new questions or query results
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Tight scroll tracking during explanation streaming
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.explaining) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }
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
      const result = await runQuery(question, dataset);
      updateMessage(id, { result, loading: false });

      if (result.rows.length > 0 && !result.error) {
        updateMessage(id, { explaining: true });
        await streamExplanation(
          question,
          result.sql,
          result.rows,
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
    <div className="flex flex-col h-screen bg-[#1a1228] text-[#e6e6fa] overflow-hidden">
      {/* Top Header Navigation */}
      <TopBar
        dataset={dataset}
        onDatasetChange={(d) => {
          setDataset(d);
          setMessages([]);
        }}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onClearChat={() => setMessages([])}
        hasMessages={messages.length > 0}
      />

      {/* Main Split-Pane Workspace */}
      <div className="flex-1 flex flex-row overflow-hidden min-h-0">
        {/* Left Side: Database Schema Sidebar Browser */}
        {sidebarOpen && (
          <div className="shrink-0 h-full hidden sm:block border-r border-white/10">
            <SchemaBrowser dataset={dataset} />
          </div>
        )}

        {/* Right Side: Chat & Workspace Pane */}
        <div className="flex-1 flex flex-col h-full min-w-0 bg-[#1e1530]">
          {/* Scrollable Chat History Container */}
          <div className="flex-grow overflow-y-auto flex flex-col">
            {messages.length === 0 ? (
              // Welcome Panel
              <div className="flex-grow flex items-center justify-center p-6 sm:p-8">
                <ExampleChips dataset={dataset} onSelect={handleQuestion} />
              </div>
            ) : (
              // Chat conversation log
              <div className="p-4 sm:p-6 md:p-8 flex-1">
                <div className="max-w-3xl mx-auto flex flex-col gap-8">
                  {messages.map((msg) => (
                    <ResultCard
                      key={msg.id}
                      message={msg}
                      onFollowUp={handleQuestion}
                    />
                  ))}
                  <div ref={bottomRef} />
                </div>
              </div>
            )}
          </div>

          {/* Bottom Chat Prompt Input bar */}
          <InputBar onSubmit={handleQuestion} disabled={busy} />
        </div>
      </div>

      {/* Mobile-Drawer Overlay style (on mobile screens schema browser is hidden unless toggle is pushed) */}
      {sidebarOpen && (
        <div className="sm:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar content drawer */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#231938] h-full shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="absolute top-3 right-3 z-50">
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white bg-white/5 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <SchemaBrowser dataset={dataset} />
          </div>
        </div>
      )}
    </div>
  );
}
