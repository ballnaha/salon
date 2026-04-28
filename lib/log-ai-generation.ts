import type { AiGenerationLogPayload } from '@/app/api/ai-log/route';

/**
 * Fire-and-forget: saves an AI generation event for cost tracking.
 * Never throws — failures are logged to console only.
 */
export async function logAiGeneration(payload: AiGenerationLogPayload): Promise<void> {
  try {
    await fetch('/api/ai-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('[ai-log] Could not save generation log:', err);
  }
}
