/**
 * AI Retry Utility - Handles "Resource Exhausted" (429) errors
 * and other transient issues with exponential backoff.
 */

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      const isRateLimit = error?.status === 429 || 
                          error?.message?.includes("429") || 
                          error?.message?.includes("Resource exhausted");
      
      const isTransient = isRateLimit || 
                          error?.status >= 500 || 
                          error?.message?.includes("fetch failed");

      if (attempt < maxRetries && isTransient) {
        // Exponential backoff with jitter
        const delay = initialDelay * Math.pow(2, attempt) + Math.random() * 1000;
        console.warn(`AI Call failed (Attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${Math.round(delay)}ms...`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
}
