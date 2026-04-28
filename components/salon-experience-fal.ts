import { falClient } from '@/lib/fal';
import type { EditImageInput, EditImageResult, EditSubscribeOptions, EditSubscribeResult, GenerationTimingBreakdown } from '@/components/salon-experience-types';

const ENDPOINT = 'openai/gpt-image-2/edit';

// ── DEV MOCK MODE (flag) ────────────────────────────────────────────────────────
// Set NEXT_PUBLIC_FAL_MOCK=true in .env.local to skip all Fal AI API calls.
// A placeholder image will be returned instead — zero credits consumed.
const IS_FAL_MOCK = process.env.NEXT_PUBLIC_FAL_MOCK === 'true';
// ───────────────────────────────────────────────────────────────────────────────


type FalQueueStatus = {
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED';
  request_id: string;
  queue_position?: number;
  metrics?: {
    inference_time: number | null;
  };
};

const summarizeInput = (input: EditImageInput) => ({
  imageCount: input.image_urls.length,
  imageKinds: input.image_urls.map((url) => (url.startsWith('data:') ? 'data-url' : 'remote-url')),
  promptLength: input.prompt.length,
  quality: input.quality,
  imageSize: input.image_size,
  outputFormat: input.output_format,
  numImages: input.num_images,
});

const summarizeResult = (result: EditImageResult) => ({
  imageCount: result.data.images.length,
  hasImages: result.data.images.length > 0,
});

const buildTimingBreakdown = ({
  startedAt,
  enqueuedAt,
  inProgressAt,
  completedAt,
  requestId,
  providerInferenceMs,
}: {
  startedAt: number;
  enqueuedAt: number | null;
  inProgressAt: number | null;
  completedAt: number;
  requestId: string | null;
  providerInferenceMs: number | null;
}): GenerationTimingBreakdown => ({
  requestId,
  submitMs: enqueuedAt ? Math.max(0, enqueuedAt - startedAt) : null,
  queueMs: enqueuedAt && inProgressAt ? Math.max(0, inProgressAt - enqueuedAt) : null,
  generationMs: providerInferenceMs ?? (inProgressAt ? Math.max(0, completedAt - inProgressAt) : null),
  totalMs: Math.max(0, completedAt - startedAt),
  providerInferenceMs,
});

// ── DEV MOCK MODE (implementation) ──────────────────────────────────────────────
// Placeholder image used in mock mode (512×683 dark grey via placehold.co)
const MOCK_IMAGE_URL = 'https://placehold.co/512x683/1a1a2e/d993a4?text=FAL+MOCK+MODE';

const mockSubscribeEdit = async (
  kind: 'analysis' | 'try-on',
  input: EditImageInput,
  options: EditSubscribeOptions = {},
): Promise<EditSubscribeResult> => {
  console.warn(`[fal][${kind}] ⚠️  MOCK MODE — skipping real API call (NEXT_PUBLIC_FAL_MOCK=true)`, summarizeInput(input));

  // Simulate submission → queued → generating → completed
  options.onStatusChange?.({ phase: 'submitting', requestId: null, queuePosition: null });
  await new Promise((r) => setTimeout(r, 1000));
  options.onStatusChange?.({ phase: 'queued', requestId: 'mock-request-id', queuePosition: 1 });
  await new Promise((r) => setTimeout(r, 2000));
  options.onStatusChange?.({ phase: 'generating', requestId: 'mock-request-id', queuePosition: null });
  await new Promise((r) => setTimeout(r, 7000));
  options.onStatusChange?.({ phase: 'completed', requestId: 'mock-request-id', queuePosition: null });

  const mockResult: EditImageResult = { data: { images: [{ url: MOCK_IMAGE_URL }] } };
  const timing: GenerationTimingBreakdown = {
    requestId: 'mock-request-id',
    submitMs: 1000,
    queueMs: 2000,
    generationMs: 7000,
    totalMs: 10000,
    providerInferenceMs: null,
  };
  return { result: mockResult, timing };
};
// ───────────────────────────────────────────────────────────────────────────────

const subscribeEdit = async (kind: 'analysis' | 'try-on', input: EditImageInput, options: EditSubscribeOptions = {}): Promise<EditSubscribeResult> => {
  if (IS_FAL_MOCK) return mockSubscribeEdit(kind, input, options);
  const subscribe = falClient.subscribe as unknown as (
    endpointId: string,
    options: {
      input: EditImageInput;
      logs?: boolean;
      onEnqueue?: (requestId: string) => void;
      onQueueUpdate?: (status: FalQueueStatus) => void;
    },
  ) => Promise<EditImageResult>;

  const MAX_RETRIES = 2;

  const isRetryableError = (error: unknown): boolean => {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      return msg.includes('timeout') || msg.includes('gateway') || msg.includes('503') || msg.includes('502');
    }
    return false;
  };

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    const startedAt = Date.now();
    let requestId: string | null = null;
    let enqueuedAt: number | null = null;
    let inProgressAt: number | null = null;
    let completedAt: number | null = null;
    let queuePosition: number | null = null;
    let providerInferenceMs: number | null = null;

    if (attempt === 1) {
      options.onStatusChange?.({ phase: 'submitting', requestId: null, queuePosition: null });
    } else {
      options.onStatusChange?.({ phase: 'submitting', requestId: null, queuePosition: null });
    }

    console.log(`[fal][${kind}] openai/gpt-image-2/edit payload (attempt ${attempt}/${MAX_RETRIES + 1})`, {
      endpoint: ENDPOINT,
      input: summarizeInput(input),
    });

    try {
      const result = await subscribe(ENDPOINT, {
        input,
        logs: false,
        onEnqueue: (nextRequestId) => {
          requestId = nextRequestId;
          enqueuedAt = Date.now();
          options.onStatusChange?.({ phase: 'queued', requestId, queuePosition });
        },
        onQueueUpdate: (status) => {
          requestId = status.request_id;

          if (status.status === 'IN_QUEUE') {
            queuePosition = typeof status.queue_position === 'number' ? status.queue_position : null;
            options.onStatusChange?.({ phase: 'queued', requestId, queuePosition });
            return;
          }

          if (status.status === 'IN_PROGRESS') {
            if (!inProgressAt) {
              inProgressAt = Date.now();
            }
            options.onStatusChange?.({ phase: 'generating', requestId, queuePosition });
            return;
          }

          completedAt = Date.now();
          if (!inProgressAt) {
            inProgressAt = completedAt;
          }
          providerInferenceMs = status.metrics?.inference_time == null ? null : Math.max(0, Math.round(status.metrics.inference_time * 1000));
          options.onStatusChange?.({ phase: 'completed', requestId, queuePosition });
        },
      });

      const timing = buildTimingBreakdown({
        startedAt,
        enqueuedAt,
        inProgressAt,
        completedAt: completedAt ?? Date.now(),
        requestId,
        providerInferenceMs,
      });

      console.log(`[fal][${kind}] openai/gpt-image-2/edit response body`, {
        result: summarizeResult(result),
        timing,
      });

      return { result, timing };
    } catch (error) {
      const errorDetails = error instanceof Error ? { message: error.message, stack: error.stack } : error;
      console.error(`[fal][${kind}] ${ENDPOINT} error (attempt ${attempt})`, {
        endpoint: ENDPOINT,
        input: summarizeInput(input),
        timing: buildTimingBreakdown({
          startedAt,
          enqueuedAt,
          inProgressAt,
          completedAt: Date.now(),
          requestId,
          providerInferenceMs,
        }),
        error: errorDetails,
      });

      // ถ้ายัง retry ได้อยู่ และเป็น error ที่ควร retry
      if (attempt <= MAX_RETRIES && isRetryableError(error)) {
        const retryDelayMs = 2000 * attempt; // 2s, 4s
        console.log(`[fal][${kind}] Retrying in ${retryDelayMs}ms... (${attempt}/${MAX_RETRIES})`);

        // แจ้ง UI ว่ากำลัง retry
        options.onStatusChange?.({ phase: 'submitting', requestId: null, queuePosition: null });
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        continue;
      }

      throw error;
    }
  }

  // ไม่ควร reach ถึงจุดนี้ แต่ TypeScript ต้องการ
  throw new Error('Unexpected end of retry loop');
};


export const subscribeAnalysisEdit = async (input: EditImageInput, options?: EditSubscribeOptions) => subscribeEdit('analysis', input, options);

export const subscribeTryOnEdit = async (input: EditImageInput, options?: EditSubscribeOptions) => subscribeEdit('try-on', input, options);
