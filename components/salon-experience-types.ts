export type FlowMode = 'analysis' | 'try-on' | 'recolor';

export type FlowStep = 'landing' | 'upload' | 'camera' | 'preview' | 'styles' | 'processing' | 'result';

export type HairstyleCategory = 'male' | 'female';

export type HairstyleOption = {
  id: string;
  label: string;
  category: HairstyleCategory;
  description: string;
  prompt: string;
  thumbnail?: string;
};

export type TryOnResult = {
  styleId: string;
  styleLabel: string;
  imageUrl: string;
};

export type HairColorOption = {
  id: string;
  label: string;
  swatch: string;
  prompt: string;
};

export type EditImageInput = {
  image_urls: string[];
  prompt: string;
  quality?: 'low' | 'medium' | 'high';
  image_size?: 'square_hd' | 'square' | 'portrait_4_3' | 'portrait_16_9' | 'landscape_4_3' | 'landscape_16_9' | 'auto';
  output_format?: 'jpeg' | 'png' | 'webp';
  num_images?: number;
};

export type EditImageResult = {
  data: {
    images: Array<{
      url: string;
    }>;
  };
};

export type EditGenerationPhase = 'submitting' | 'queued' | 'generating' | 'completed';

export type GenerationTimingBreakdown = {
  requestId: string | null;
  submitMs: number | null;
  queueMs: number | null;
  generationMs: number | null;
  totalMs: number;
  providerInferenceMs: number | null;
};

export type EditSubscribeStatus = {
  phase: EditGenerationPhase;
  requestId: string | null;
  queuePosition: number | null;
};

export type EditSubscribeOptions = {
  onStatusChange?: (status: EditSubscribeStatus) => void;
};

export type EditSubscribeResult = {
  result: EditImageResult;
  timing: GenerationTimingBreakdown;
};
