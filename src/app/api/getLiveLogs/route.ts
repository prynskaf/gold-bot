// /src/app/api/getLiveLogs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getLiveLogs } from '@/jobs/tradeBot/tradeBot';

export async function GET(_: NextRequest): Promise<NextResponse> {
  const logs = getLiveLogs();
  return NextResponse.json({ logs });
}
