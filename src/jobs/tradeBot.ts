import cron from 'node-cron';
import { calculateRSI } from '@/utils/rsi';
import { getDb } from '@/lib/mongodb';
import axios from 'axios';

// API URL for fetching gold price data
const API_URL = 'https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD';

// Log store structure and initialization
interface LogEntry {
  message: string;
  timestamp: string; // ISO string for timestamp
}

const logStore: LogEntry[] = [];

// Interface for the structure of the spread profile
interface SpreadProfile {
  spreadProfile: string;
  bidSpread: number;
  askSpread: number;
  bid: number;
  ask: number;
}

// Interface for the structure of price data from the API
interface PriceData {
  topo: {
    platform: string;
    server: string;
  };
  spreadProfilePrices: SpreadProfile[];
  ts: number;
}

// Interface for the recent price used in RSI calculation
interface PricePoint {
  price: number;
}

// Function to fetch logs (for the API)
export function getLiveLogs(): LogEntry[] {
  // Return the last 5 logs for efficiency
  return logStore.slice(-5);
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
      const primeProfile = item.spreadProfilePrices.find((profile: SpreadProfile) =>
        profile.spreadProfile.toLowerCase() === 'prime'
      );
      if (primeProfile) {
        return primeProfile.bid;
      }
    }

    throw new Error('No Prime profile found in the data');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching gold price:', errorMessage);
    logStore.push({ message: `Error fetching gold price: ${errorMessage}`, timestamp: new Date().toISOString() });
    throw new Error('Failed to fetch gold price data');
  }
}

// Function to execute a trade based on the RSI calculation
async function executeTrade(): Promise<void> {
  try {
    const currentPrice: number = await fetchGoldPrice();
    const recentPrices: PricePoint[] = Array.from({ length: 15 }, () => ({
      price: currentPrice + (Math.random() - 0.5) * 5,
    }));

    const rsi: number | null = calculateRSI(recentPrices);

    if (rsi === null) {
      const message = 'RSI calculation returned null';
      console.warn(message);
      logStore.push({ message, timestamp: new Date().toISOString() });
      return;
    }

    // Round the RSI value to 2 decimal places
    const roundedRSI = Math.round(rsi * 100) / 100;

    let signal: 'Buy' | 'Sell' | 'Hold' = 'Hold';
    let stopLoss: number = 0;
    let takeProfit: number = 0;

    if (roundedRSI < 30) {
      signal = 'Buy';
      stopLoss = currentPrice - 10;
      takeProfit = currentPrice + 20;
    } else if (roundedRSI > 70) {
      signal = 'Sell';
      stopLoss = currentPrice + 10;
      takeProfit = currentPrice - 20;
    }

    const timestamp = new Date().toISOString();
    if (signal !== 'Hold') {
      const db = await getDb();
      const collection = db.collection('trades');
      await collection.insertOne({
        signal,
        stopLoss,
        takeProfit,
        currentPrice,
        rsi: roundedRSI, // Save the rounded RSI value in the database
        timestamp: new Date(),
      });

      const logMessage = `Executed trade: ${signal} at ${currentPrice}, RSI: ${roundedRSI}`;
      console.log(logMessage);
      logStore.push({ message: logMessage, timestamp });
    } else {
      const logMessage = `No trade executed, RSI is within neutral range: ${roundedRSI}`;
      console.log(logMessage);
      logStore.push({ message: logMessage, timestamp });
    }

    // Limit logStore size to avoid memory overflow (e.g., keep the last 100 logs)
    if (logStore.length > 100) {
      logStore.shift(); // Remove the oldest log
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error executing trade:', errorMessage);
    logStore.push({ message: `Error executing trade: ${errorMessage}`, timestamp: new Date().toISOString() });
  }
}

// Schedule the trade execution function to run every minute
if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'production') {
  cron.schedule('* * * * *', () => {
    console.log('Running trade bot...');
    executeTrade();
  });
}
