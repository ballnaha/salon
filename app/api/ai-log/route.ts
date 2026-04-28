import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

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
          const buffer = Buffer.from(await response.arrayBuffer());
          
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
        salonId:        branchId,
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
