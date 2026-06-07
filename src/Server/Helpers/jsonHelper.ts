/**
 * Safely parses a JSON string, returning a fallback value if parsing fails.
 * 
 * @param jsonString The JSON string to parse
 * @param fallback The fallback value to return on syntax error
 * @returns The parsed object or the fallback
 */
export function safeJsonParse<T>(jsonString: string | null | undefined, fallback: T): T {
  if (!jsonString) {
    return fallback;
  }
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error("[safeJsonParse] Error parsing JSON:", error);
    return fallback;
  }
}
