export type Dataset = "nyc_taxi" | "ecommerce";
export type Model = "claude" | "openai";

export interface QueryResponse {
  question: string;
  sql: string;
  rows: Record<string, unknown>[];
  row_count: number;
  error: string | null;
  error_code: "BLOCKED_STATEMENT" | "INVALID_TABLE" | "PARSE_ERROR" | null;
}

export interface Message {
  id: string;
  question: string;
  result: QueryResponse | null;
  explanation: string;
  followUps: string[];
  loading: boolean;
  explaining: boolean;
}
