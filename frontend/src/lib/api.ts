import type { Dataset, QueryResponse, SchemaResponse } from "./types";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function fetchSchema(dataset: Dataset): Promise<SchemaResponse> {
  const res = await fetch(`${API}/schema?dataset=${dataset}`);
  if (!res.ok) throw new Error("Failed to load schema");
  return res.json();
}

export async function runQuery(
  question: string,
  dataset: Dataset
): Promise<QueryResponse> {
  const res = await fetch(`${API}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, dataset }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail ?? "Query failed");
  }
  return res.json();
}

/**
 * Stream the explanation for a completed query.
 * Calls onToken for each text chunk, onFollowUps when suggestions arrive, onDone when finished.
 */
export async function streamExplanation(
  question: string,
  sql: string,
  rows: Record<string, unknown>[],
  onToken: (token: string) => void,
  onFollowUps: (questions: string[]) => void,
  onDone: () => void
): Promise<void> {
  const res = await fetch(`${API}/explain`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ question, sql, rows }),
  });

  if (!res.ok || !res.body) {
    onDone();
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    let currentEvent = "";
    for (const line of lines) {
      if (line.startsWith("event:")) {
        currentEvent = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        const data = line.startsWith("data: ") ? line.slice(6) : line.slice(5);
        if (currentEvent === "token") {
          onToken(data);
        } else if (currentEvent === "follow_ups") {
          try {
            onFollowUps(JSON.parse(data));
          } catch {
            // ignore malformed JSON
          }
        } else if (currentEvent === "done") {
          onDone();
          return;
        }
        currentEvent = "";
      }
    }
  }
  onDone();
}
