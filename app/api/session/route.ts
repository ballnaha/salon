import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export interface CreateSessionPayload {
  originalImageBase64: string;
  salonId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { originalImageBase64, salonId }: CreateSessionPayload = await req.json();

    if (!originalImageBase64) {
      return NextResponse.json({ ok: false, error: 'Missing originalImageBase64' }, { status: 400 });
    }

    const branchId = salonId || 'default_salon';

    // Create a new session record in DB to get a UUID
    const session = await prisma.customerSession.create({
      data: { 
        userId: branchId === 'default_salon' ? null : branchId 
      }
    });

    const sessionId = session.id;
    const sessionDir = path.join(process.cwd(), 'public', 'uploads', branchId, sessionId);
    
    // Ensure directory exists
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    // Save the original image
    const matches = originalImageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer: Buffer;
    let extension = 'jpg';

    if (matches && matches.length === 3) {
      const type = matches[1];
      const data = matches[2];
      buffer = Buffer.from(data, 'base64');
      if (type === 'image/png') extension = 'png';
      else if (type === 'image/webp') extension = 'webp';
      else if (type === 'image/jpeg') extension = 'jpg';
    } else {
      // Fallback if it's just raw base64 without prefix
      buffer = Buffer.from(originalImageBase64, 'base64');
    }

    const filename = `original.${extension}`;
    const filePath = path.join(sessionDir, filename);
    const dbPath = `/uploads/${branchId}/${sessionId}/${filename}`;

    fs.writeFileSync(filePath, buffer);

    // Update session with the path
    await prisma.customerSession.update({
      where: { id: sessionId },
      data: { originalImagePath: dbPath }
    });

    return NextResponse.json({ ok: true, sessionId });
  } catch (err) {
    console.error('[session] Failed to create session:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
