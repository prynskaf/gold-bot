import axios from 'axios';

// API URL for fetching gold price data
const API_URL = 'https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD';

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

// Function to fetch the current price of XAU/USD from Swissquote
export async function fetchGoldPrice(): Promise<number> {
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching gold price:', errorMessage);
    throw new Error('Failed to fetch gold price data');
  }
}
