export type Dataset = "chinook" | "imdb";

export interface QueryResponse {
  question: string;
  sql: string;
  rows: Record<string, unknown>[];
  row_count: number;
  error: string | null;
  error_code: "BLOCKED_STATEMENT" | "INVALID_TABLE" | "PARSE_ERROR" | "UNANSWERABLE" | "EMPTY_SQL" | null;
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

export interface SchemaColumn {
  name: string;
  type: string;
}

export interface SchemaTable {
  name: string;
  columns: SchemaColumn[];
  sample_rows: Record<string, unknown>[];
}

export interface SchemaResponse {
  dataset: string;
  tables: SchemaTable[];
}
