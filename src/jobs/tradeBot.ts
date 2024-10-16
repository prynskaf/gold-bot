// /src/jobs/tradeBot.ts
import cron from 'node-cron';
import { calculateRSI } from '@/utils/rsi';
import { getDb } from '@/lib/mongodb';
import axios from 'axios';

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
    
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Invalid response structure or no data available');
    }

    for (const item of data) {
      const primeProfile = item.spreadProfilePrices.find((profile) => 
        profile.spreadProfile.toLowerCase() === 'prime'
      );
      if (primeProfile) {
        return primeProfile.bid;
      }
    }

    throw new Error('No Prime profile found in the data');
  } catch (error) {
    console.error('Error fetching gold price:', error);
    throw new Error('Failed to fetch gold price data');
  }
}

// Define a type for recent prices used in RSI calculation
interface PricePoint {
  price: number;
}

async function executeTrade(): Promise<void> {
  try {
    const currentPrice: number = await fetchGoldPrice();
    const recentPrices: PricePoint[] = Array.from({ length: 15 }, () => ({
      price: currentPrice + (Math.random() - 0.5) * 5,
    }));

    const rsi: number | null = calculateRSI(recentPrices);

    if (rsi === null) {
      console.warn('RSI calculation returned null');
      return;
    }

    let signal: 'Buy' | 'Sell' | 'Hold' = 'Hold';
    let stopLoss = 0;
    let takeProfit = 0;

    if (rsi < 30) {
      signal = 'Buy';
      stopLoss = currentPrice - 10;
      takeProfit = currentPrice + 20;
    } else if (rsi > 70) {
      signal = 'Sell';
      stopLoss = currentPrice + 10;
      takeProfit = currentPrice - 20;
    }

    if (signal !== 'Hold') {
      const db = await getDb();
      const collection = db.collection('trades');
      await collection.insertOne({
        signal,
        stopLoss,
        takeProfit,
        currentPrice,
        rsi,
        timestamp: new Date(),
      });

      console.log(`Executed trade: ${signal} at ${currentPrice}, RSI: ${rsi}`);
    } else {
      console.log(`No trade executed, RSI is within neutral range: ${rsi}`);
    }
  } catch (error) {
    console.error('Error executing trade:', error);
  }
}

// Only run the cron job if the environment is development or production
if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'production') {
  cron.schedule('* * * * *', () => {
    console.log('Running trade bot...');
    executeTrade();
  });
}
