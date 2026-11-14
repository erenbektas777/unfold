import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'unfold',
    timestamp: new Date().toISOString(),
  });
}
