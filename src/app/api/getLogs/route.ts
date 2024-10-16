// GET LOGS
import { NextRequest, NextResponse } from 'next/server';
import { getLiveLogs } from '@/jobs/tradeBot'; // Make sure this path is correct

export async function GET(_: NextRequest): Promise<NextResponse> {
  try {
    // Fetch logs from the in-memory log store
    const logs = getLiveLogs();
    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
