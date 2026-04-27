import type { HairColorOption, HairstyleOption } from '@/components/salon-experience-types';

export const analysisPrompt = [
  'Create a hair analysis infographic from this portrait.',
  'Return one vertical 2:3 composite infographic on a clean light-gray background with dark uppercase panel headers.',
  'English only. Use very short labels only: 1-3 words, no paragraphs, no Thai, no decorative fonts.',
  'Photoreal only. Keep the same identity, facial geometry, skin texture, pose, framing, camera angle, and perspective across all panels.',
  'Only the top-left main portrait may be the exact unedited source photo.',
  'All other mini cards must show clear hair changes while preserving the same person.',
  'Use a precise grid, thin dividers, equal padding, and high readability.',
  '',
  'Required layout:',
  '- Row 1: left large original portrait, right "HAIR & FACE ANALYSIS" 5-column metrics grid: Face Shape, Hair Texture, Hair Density, Hairline & Forehead, Overall Vibe.',
  '- Row 2: "BEST HAIRSTYLES" with exactly 5 mini portrait cards and subtle green check markers; "NOT RECOMMENDED" with exactly 3 mini portrait cards and subtle red X markers.',
  '- Row 3: "HAIR LENGTH" with exactly 3 cards: Short, Medium, Long; "PARTING & FRINGE" with exactly 5 cards.',
  '- Row 4: one wide "HAIR COLOR" panel with "TONE ANALYSIS" swatches for Warm, Neutral, Cool and "COLOR EXAMPLES" with exactly 6 mini portrait cards.',
  '- Row 5: "OVERALL LOOK" with 4 icon-style traits; "YOU SUIT" with 3 short bullet recommendations and 1 small portrait.',
  '',
  'Card rules:',
  '- Keep panel labels and bullets concise; YOU SUIT bullets max 5 words each.',
  '- Markers must be small, subtle, thin, and placed top-left without covering the face.',
  '- BEST HAIRSTYLES, NOT RECOMMENDED, HAIR LENGTH, PARTING & FRINGE, and COLOR EXAMPLES must not reuse the exact unedited source portrait.',
  '- Each mini card must visibly differ by hairstyle shape, length, parting/fringe, or color.',
  '- In HAIR COLOR, change color only on the same hairstyle shape.',
].join('\n');

export function buildTryOnPrompt(style: HairstyleOption) {
  return [
    'Edit this portrait into a realistic salon try-on result based on a hairstyle that is highly popular in Thailand.',
    `Target hairstyle name: ${style.label}.`,
    `Thai hairstyle brief: ${style.description}.`,
    'Preserve the exact identity, face, skin tone, pose, camera angle, and lighting of the person.',
    'Prioritize the visible hairstyle silhouette, fringe shape, volume placement, parting, and length so the haircut reads clearly at a glance.',
    'Keep the result believable for a real salon makeover, with realistic hair density, natural strand direction, and no exaggerated fashion-editorial distortion.',
    style.prompt,
    'Keep the image photorealistic, premium salon quality, and suitable for before-after comparison.',
    'Do not change gender presentation, facial identity, or background composition.',
  ].join(' ');
}

export function buildHairColorPrompt(styleLabel: string, color: HairColorOption) {
  const isOriginal = styleLabel === 'ทรงผมเดิม';
  const targetDesc = isOriginal ? "the person's existing hair" : `the ${styleLabel} hairstyle`;
  
  return [
    `Edit this image for hair coloring preview on ${targetDesc}.`,
    `Target hair color: ${color.label}.`,
    color.prompt,
    'Change only the hair color. Do not change the haircut, shape, or length.',
    'Preserve the exact same face identity, facial features, skin tone, head shape, hairstyle shape, hair length, hairline, fringe, parting, and hair texture.',
    'Keep pose, camera angle, lighting, background, and clothing unchanged.',
    'Do not retouch facial structure and do not alter makeup intensity.',
    'Return one photorealistic salon-quality image suitable for before-after color comparison.',
  ].join(' ');
}
