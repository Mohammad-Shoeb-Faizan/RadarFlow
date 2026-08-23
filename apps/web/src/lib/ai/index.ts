import { AIProvider } from "./types";
import { GeminiAIProvider } from "./gemini-provider";
import { NoopAIProvider } from "./noop-provider";

export * from "./types";

export function getAIProvider(): AIProvider {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey.trim().length > 0) {
    return new GeminiAIProvider(geminiKey);
  }
  return new NoopAIProvider();
}
