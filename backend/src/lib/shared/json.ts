/**
 * Parse a JSON string, returning a fallback on any parse error.
 * Used across routes/libs that store JSON in text columns.
 */
export function parseJSON<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
