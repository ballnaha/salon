import type { HairColorOption, HairstyleOption } from '@/components/salon-experience-types';

export const analysisPrompt = [
  'Create a professional salon hair analysis infographic from this portrait.',
  'English text only — do not use any non-Latin characters.',
  '',
  'VISUAL STYLE (strictly follow):',
  '- Background: warm cream-white (#FAF7F4) with very light warm-gray section dividers.',
  '- Accent color: warm rose-pink (#E8A0A0 to #D4837A). Use it for section header icons, checkmarks, and thin rule lines.',
  '- Typography: clean sans-serif. Section headers in bold dark uppercase. Sub-labels in smaller rose-pink uppercase. Body text in soft charcoal.',
  '- Each section has a soft warm-white card with barely-visible rounded border (1px warm gray).',
  '- All portrait mini-cards use a uniform warm-cream background, soft drop shadow, gently rounded corners.',
  '- Overall feel: elegant Korean-inspired beauty magazine / premium salon look.',
  '',
  'REQUIRED LAYOUT (top to bottom):',
  '- Row 1 (2-col): LEFT — large original portrait (portrait crop, warm-cream bg). RIGHT — "HAIR ANALYSIS" bold header, then a clean 1-column list of 5 metric rows: Face Shape | Hair Texture | Hair Density | Hairline & Forehead | Overall Vibe. Each row: small rose-pink line-art icon | metric name (bold dark) | result value in dark bold | result illustration on far right. Overall Vibe shows 3 soft color swatches.',
  '- Row 2 (2-col): LEFT card — checkmark icon + "BEST HAIRSTYLES" — exactly 4 mini portrait cards in a row, each labeled with hairstyle name. RIGHT card — X icon + "NOT RECOMMENDED" — exactly 3 mini portrait cards, each labeled.',
  '- Row 3 (2-col): LEFT — "HAIR LENGTH" with exactly 3 mini portraits labeled SHORT, MEDIUM, LONG. RIGHT — "PARTING & FRINGE" with exactly 5 mini portraits labeled.',
  '- Row 4 (full-width): "HAIR COLOR". Left sub-panel: "BEST TONES" with 2×3 grid of hair color swatches (Warm / Neutral / Cool × 2 shades each), labeled. Right sub-panel: "COLOR EXAMPLES ON YOU" with exactly 5 mini portrait cards showing different hair colors, each labeled with color name.',
  '- Row 5 (full-width footer): "OVERALL LOOK" — 4 icon+text traits in a horizontal row, small rose-pink line-art icons, short English descriptor below each.',
  '',
  'PORTRAIT RULES:',
  '- Photoreal, consistent identity. The source photo is used ONLY as the top-left large portrait.',
  '- All mini cards show clear, visible hair changes (style, length, parting, or color) while keeping the same face, skin tone, and pose.',
  '- Do not reuse the unedited source photo in any mini card.',
  '- Keep gender, age, skin tone, and facial identity consistent throughout.',
  '- Mini portrait cards: uniform size, warm-cream background, soft shadow.',
].join('\n');


export function buildTryOnPrompt(style: HairstyleOption) {
  return [
    'Edit this portrait into a realistic salon try-on result based on a hairstyle that is highly popular in Thailand.',
    `Target hairstyle name: ${style.label}.`,
    `Thai hairstyle brief: ${style.description}.`,
    'Preserve the exact identity, face, skin tone, pose, camera angle, and lighting of the person.',
    'Keep the exact same framing, crop, and zoom level as the original photo. Do not zoom in or out.',
    'Ensure the head position and composition remain identical to the input image.',
    'STRICTLY PRESERVE facial structure: Do not alter the jawline, face width, neck, or overall facial proportions. The person must not look thinner or heavier.',
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
    'Change ONLY the hair color pixels. Do not change anything else.',
    'The output image must be pixel-perfect identical to the input image in every way EXCEPT hair color:',
    '- Same exact framing, crop, zoom level, and field of view. Do not zoom in or out.',
    '- Same exact composition and subject position within the frame.',
    '- Same exact haircut, hairstyle shape, hair length, hairline, fringe, and parting.',
    '- Same exact face identity, facial features, skin tone, head shape, and hair texture.',
    '- STRICTLY PRESERVE facial structure: Do not alter the jawline, face width, or facial proportions. The person must not look thinner or heavier.',
    '- Same exact pose, camera angle, lighting direction, and background.',
    '- Same exact clothing, accessories, and makeup intensity.',
    'Return one photorealistic salon-quality image suitable for before-after color comparison.',
  ].join(' ');
}
