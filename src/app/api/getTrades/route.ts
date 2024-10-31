// src/api/getTrades/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb/mongodb';
import { ObjectId } from 'mongodb';

// Define a Trade interface for type safety
interface Trade {
  _id: ObjectId;
  signal: string;
  stopLoss: number;
  takeProfit: number;
  currentPrice: number;
  rsi: number;
  timestamp: Date;
}

// Response type after transformation
interface TradeResponse {
  _id: string;
  signal: string;
  stopLoss: number;
  takeProfit: number;
  currentPrice: number;
  rsi: number;
  timestamp: string;
}

export async function GET(_: NextRequest): Promise<NextResponse<TradeResponse[] | { error: string }>> {
  try {
    const db = await getDb();
    const collection = db.collection<Trade>('trades');

    // Retrieve the last 10 trades (most recent first)
    const trades = await collection.find().sort({ timestamp: -1 }).limit(10).toArray();

    // Transform the trades, converting ObjectID to string and timestamp to ISO string
    const transformedTrades: TradeResponse[] = trades.map((trade) => ({
      ...trade,
      _id: trade._id.toString(), // Convert MongoDB ObjectID to string
      timestamp: trade.timestamp.toISOString(), // Convert Date to ISO string
    }));

    return NextResponse.json<TradeResponse[]>(transformedTrades);
  } catch (error) {
    console.error('Error fetching trades:', error);
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
  }
}
