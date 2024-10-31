// /src/api/trade/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { calculateRSI } from '@/utils/rsi/rsi';
import { getDb } from '@/lib/mongodb/mongodb';
import { fetchGoldPrice } from '@/utils/fetchGoldPrice/fetchGoldPrice';

export async function POST(_: NextRequest): Promise<NextResponse> {
    try {
        // Fetch the latest gold price data using the Swissquote API
        const currentPrice: number = await fetchGoldPrice();

        // Mocking historical prices with slight variations for RSI calculation
        const recentPrices = Array.from({ length: 15 }, () => ({
            price: currentPrice + (Math.random() - 0.5) * 10, // Adding small random variations
        }));

        const rsi = calculateRSI(recentPrices);

        // Handle the case when RSI is null
        if (rsi === null) {
            console.warn('RSI calculation returned null');
            return NextResponse.json({ 
                error: 'Insufficient data for RSI calculation', 
                currentPrice 
            }, { status: 400 });
        }

        let signal: 'Buy' | 'Sell' | 'Hold' = 'Hold';
        let stopLoss = 0;
        let takeProfit = 0;

        // Adjusted trading logic based on RSI values
        if (rsi < 40) { // Changed threshold for buying
            signal = 'Buy';
            stopLoss = currentPrice - 10; // Example stop loss set below current price
            takeProfit = currentPrice + 20; // Example take profit set above current price
        } else if (rsi > 60) { // Changed threshold for selling
            signal = 'Sell';
            stopLoss = currentPrice + 10; // Example stop loss set above current price
            takeProfit = currentPrice - 20; // Example take profit set below current price
        }

        // Save trade data if there is a Buy or Sell signal
        if (signal !== 'Hold') {
            const db = await getDb();
            const collection = db.collection('trades');
            const resultInsert = await collection.insertOne({
                signal,
                stopLoss,
                takeProfit,
                currentPrice,
                rsi,
                timestamp: new Date(),
            });

            return NextResponse.json({
                signal,
                stopLoss,
                takeProfit,
                currentPrice,
                rsi,
                insertedId: resultInsert.insertedId,
            });
        } else {
            return NextResponse.json({
                signal,
                message: 'No trade executed as RSI is within the neutral range.',
                currentPrice,
                rsi,
            });
        }
    } catch (error) {
        console.error('Error executing trade:', error);
        return NextResponse.json({ error: 'Failed to execute trade' }, { status: 500 });
    }
}
