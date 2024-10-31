// /src/jobs/tradeBot.ts
import cron from 'node-cron';
import { calculateRSI } from '@/utils/rsi/rsi';
import { getDb } from '@/lib/mongodb/mongodb';
import { fetchGoldPrice } from '@/utils/fetchGoldPrice/fetchGoldPrice';

// Log store structure and initialization
interface LogEntry {
  message: string;
  timestamp: string; // ISO string for timestamp
}

const logStore: LogEntry[] = [];

// Interface for the recent price used in RSI calculation
interface PricePoint {
  price: number;
}

// Function to fetch logs (for the API)
export function getLiveLogs(): LogEntry[] {
  // Return the last 5 logs, ordered with the latest first
  return logStore.slice(-5).reverse();
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

    // Since the RSI is already rounded in the calculateRSI function, we use it directly
    let signal: 'Buy' | 'Sell' | 'Hold' = 'Hold';
    let stopLoss: number = 0;
    let takeProfit: number = 0;

    // Trading logic based strictly on RSI values
    if (rsi < 30) {
      signal = 'Buy';
      stopLoss = currentPrice - 10;
      takeProfit = currentPrice + 20;
    } else if (rsi > 70) {
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
        rsi, // Use the RSI value directly as it's already rounded
        timestamp: new Date(),
      });

      const logMessage = `Executed trade: ${signal} at ${currentPrice}, RSI: ${rsi}`;
      console.log(logMessage);
      logStore.push({ message: logMessage, timestamp });
    } else {
      const logMessage = `No trade executed, RSI is within neutral range: ${rsi}`;
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
