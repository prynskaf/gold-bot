// Get gold price
import { fetchGoldPrice } from '@/utils/fetchGoldPrice/fetchGoldPrice';
import { NextRequest, NextResponse } from 'next/server';



export async function GET(_: NextRequest): Promise<NextResponse> {
    try {
      const price = await fetchGoldPrice();
      return NextResponse.json({ price });
    } catch (error) {
      console.error('Error fetching gold price:', error);
      return NextResponse.json({ error: 'Failed to fetch gold price' }, { status: 500 });
    }
  }
  