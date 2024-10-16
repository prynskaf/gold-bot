// src/api/trade/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { calculateRSI } from '@/utils/rsi';
import { getDb } from '@/lib/mongodb';

const API_URL = 'https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD';

// Define types based on the API response structure
interface SpreadProfile {
  spreadProfile: string;
  bidSpread: number;
  askSpread: number;
  bid: number;
  ask: number;
}

interface PriceData {
  topo: {
    platform: string;
    server: string;
  };
  spreadProfilePrices: SpreadProfile[];
  ts: number;
}

// Function to fetch the current price of XAU/USD from Swissquote
async function fetchGoldPrice(): Promise<number> {
  try {
    const response = await axios.get<PriceData[]>(API_URL);
    const data = response.data;

    // Ensure the data structure is valid
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Invalid response structure or no data available');
    }

    // Extract the price from the "Prime" spread profile
    for (const item of data) {
      const primeProfile = item.spreadProfilePrices.find((profile: SpreadProfile) => 
        profile.spreadProfile.toLowerCase() === 'prime'
      );
      if (primeProfile) {
        return primeProfile.bid; // Return the bid price from the prime profile
      }
    }

    throw new Error('No Prime profile found in the data');
  } catch (error) {
    console.error('Error fetching gold price:', error);
    throw new Error('Failed to fetch gold price data');
  }
}

export async function POST(_: NextRequest): Promise<NextResponse> {
  try {
    // Fetch the latest gold price data using the Swissquote API
    const currentPrice: number = await fetchGoldPrice();

    // Mocking historical prices with slight variations for RSI calculation
    const recentPrices = Array.from({ length: 15 }, () => ({
      price: currentPrice + (Math.random() - 0.5) * 5, // Adding small random variations
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

    // Trading logic based strictly on RSI values
    if (rsi < 30) {
      // Buy when RSI is below 30 (oversold condition)
      signal = 'Buy';
      stopLoss = currentPrice - 10; // Example stop loss set below current price
      takeProfit = currentPrice + 20; // Example take profit set above current price
    } else if (rsi > 70) {
      // Sell when RSI is above 70 (overbought condition)
      signal = 'Sell';
      stopLoss = currentPrice + 10; // Example stop loss set above current price
      takeProfit = currentPrice - 20; // Example take profit set below current price
    }

    // Only save trade data if there is a Buy or Sell signal
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
      // If the signal is "Hold", return a response indicating no trade was made
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
