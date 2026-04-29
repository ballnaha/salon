import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { hairColorOptions } from '@/components/salon-experience-styles';

export interface AiGenerationLogPayload {
  sessionId?: string;
  salonId?: string;
  generationType: 'analysis' | 'try-on' | 'hair-color';
  styleId?: string;
  styleLabel?: string;
  colorId?: string;
  colorLabel?: string;
  modelId?: string;
  outputImageUrl?: string;
  durationMs?: number;
  queueMs?: number;
  inferenceMs?: number;
  success: boolean;
  errorMessage?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: AiGenerationLogPayload = await req.json();
    let localDbPath: string | null = null;
    const branchId = body.salonId || 'default_salon';

    // Download image if successful and we have a sessionId
    if (body.success && body.outputImageUrl && body.sessionId) {
      try {
        const response = await fetch(body.outputImageUrl);
        if (response.ok) {
          let buffer: any = Buffer.from(await response.arrayBuffer());
          
          // Apply overlay using sharp if it's try-on or hair-color
          if (body.generationType === 'try-on' || body.generationType === 'hair-color') {
            try {
              const styleLabel = body.styleLabel;
              const colorLabel = body.colorLabel;
              const activeColor = hairColorOptions.find(c => c.id === body.colorId);
              const colorSwatch = activeColor?.swatch;

              const hasStyle = body.generationType === 'try-on' && styleLabel && styleLabel !== 'ทรงผมเดิม';
              const hasColor = !!colorLabel;

              if (hasStyle || hasColor) {
                const metadata = await sharp(buffer).metadata();
                const width = metadata.width || 1024;
                const height = metadata.height || 1024;

                const padding = Math.max(20, width * 0.04);
                const fontSize = Math.max(20, Math.floor(width * 0.035));
                const smallFontSize = Math.max(16, Math.floor(fontSize * 0.75));
                
                let boxHeight = padding;
                const textElements = [];
                let currentY = padding * 0.8;

                if (hasStyle) {
                  textElements.push(`<text x="${padding * 0.75}" y="${currentY}" font-family="sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" dominant-baseline="hanging">${styleLabel}</text>`);
                  currentY += fontSize + 8;
                }

                if (hasColor) {
                  const cx = padding * 0.75;
                  if (colorSwatch) {
                    textElements.push(`<circle cx="${cx + smallFontSize/2}" cy="${currentY + smallFontSize/2}" r="${smallFontSize/2}" fill="${colorSwatch}" stroke="white" stroke-width="2" />`);
                    textElements.push(`<text x="${cx + smallFontSize + 8}" y="${currentY}" font-family="sans-serif" font-size="${smallFontSize}" fill="white" dominant-baseline="hanging">${colorLabel}</text>`);
                  } else {
                    textElements.push(`<text x="${cx}" y="${currentY}" font-family="sans-serif" font-size="${smallFontSize}" fill="white" dominant-baseline="hanging">${colorLabel}</text>`);
                  }
                  currentY += smallFontSize + 4;
                }

                boxHeight = currentY + padding * 0.6;
                const boxWidth = width * 0.5; // Fixed relative width for simplicity

                const svgOverlay = `
                  <svg width="${width}" height="${height}">
                    <rect x="${padding}" y="${height - padding - boxHeight}" width="${boxWidth}" height="${boxHeight}" rx="12" fill="rgba(0,0,0,0.6)" />
                    <g transform="translate(${padding}, ${height - padding - boxHeight})">
                      ${textElements.join('')}
                    </g>
                  </svg>
                `;

                buffer = (await sharp(buffer)
                  .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
                  .toBuffer()) as unknown as Buffer;
              }
            } catch (sharpError) {
              console.error('[ai-log] Sharp overlay error:', sharpError);
              // Continue with original buffer if overlay fails
            }
          }

          const sessionDir = path.join(process.cwd(), 'public', 'uploads', branchId, body.sessionId);
          if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
          }

          const timestamp = Date.now();
          const filename = `${timestamp}_${body.generationType}.jpg`;
          const filePath = path.join(sessionDir, filename);
          
          fs.writeFileSync(filePath, buffer);
          localDbPath = `/uploads/${branchId}/${body.sessionId}/${filename}`;
        } else {
          console.error(`[ai-log] Failed to download image: ${response.statusText}`);
        }
      } catch (dlError) {
        console.error('[ai-log] Error downloading generated image:', dlError);
      }
    }

    const log = await prisma.aiGenerationLog.create({
      data: {
        sessionId:      body.sessionId      ?? null,
        userId:         branchId === 'default_salon' ? null : branchId,
        generationType: body.generationType,
        styleId:        body.styleId        ?? null,
        styleLabel:     body.styleLabel     ?? null,
        colorId:        body.colorId        ?? null,
        colorLabel:     body.colorLabel     ?? null,
        modelId:        body.modelId        ?? null,
        outputImageUrl: body.outputImageUrl ?? null,
        localImagePath: localDbPath,
        durationMs:     body.durationMs     ?? null,
        queueMs:        body.queueMs        ?? null,
        inferenceMs:    body.inferenceMs    ?? null,
        success:        body.success,
        errorMessage:   body.errorMessage   ?? null,
      },
    });

    return NextResponse.json({ ok: true, id: log.id });
  } catch (err) {
    console.error('[ai-log] Failed to save generation log:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
