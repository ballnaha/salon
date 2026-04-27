import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // แนะนำให้ใช้ FAL_ADMIN_KEY เพื่อเช็คบิล แต่ถ้าไม่มีก็ลองใช้ FAL_KEY ก่อน
    const falKey = process.env.FAL_ADMIN_KEY || process.env.FAL_KEY; 

    if (!falKey) {
      return NextResponse.json({ error: 'FAL_KEY is not configured' }, { status: 500 });
    }

    // เรียก API ของ Fal.ai เพื่อเช็คยอดคงเหลือ
    const response = await fetch('https://api.fal.ai/v1/account/billing?expand=credits', {
      method: 'GET',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json'
      },
      // ไม่ต้อง cache เพื่อให้ได้ค่ายอดเงินล่าสุดเสมอ
      cache: 'no-store'
    });

    if (response.status === 403 || response.status === 401) {
      // API Key ที่ใช้ไม่มีสิทธิ์เข้าถึงข้อมูลบิล (ต้องเป็น Admin API Key)
      return NextResponse.json({ 
        error: 'Admin API key required', 
        needsAdmin: true 
      }, { status: 403 });
    }

    if (!response.ok) {
      throw new Error(`Fal API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching Fal credit balance:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
