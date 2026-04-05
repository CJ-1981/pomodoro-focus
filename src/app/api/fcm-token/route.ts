import { NextRequest, NextResponse } from 'next/server';

// In production, store tokens in database
// For now, store in memory (tokens persist only while server runs)
const tokens: Set<string> = new Set();

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }
    tokens.add(token);
    return NextResponse.json({ success: true, count: tokens.size });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ count: tokens.size });
}
