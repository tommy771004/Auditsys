import { GoogleGenAI, GenerateContentConfig } from "@google/genai";

export class LlmPipeline {
  static async callWithRetry<T>(
    ai: GoogleGenAI,
    model: string,
    prompt: string,
    config: GenerateContentConfig,
    maxRetries: number = 2,
    onRetry?: (attempt: number, error: unknown) => void
  ): Promise<T> {
    let currentPrompt = prompt;
    let attempt = 0;
    
    while (attempt <= maxRetries) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: currentPrompt,
          config,
        });

        const text = response.text ?? "";
        return JSON.parse(text) as T;
      } catch (err: any) {
        attempt++;
        if (onRetry) {
          onRetry(attempt, err);
        }
        if (attempt > maxRetries) {
          throw err;
        }
        
        // Ingest JSON parsing errors as feedback to the model
        currentPrompt = prompt + `\n\n[System Review Feedback]\nYour previous output failed JSON parsing with this error: ${err.message}. Please fix the syntax and ensure you output only a valid JSON array matching the schema, with no markdown wrappers or trailing commas.`;
      }
    }
    
    throw new Error("LlmPipeline retry exhausted");
  }
}
