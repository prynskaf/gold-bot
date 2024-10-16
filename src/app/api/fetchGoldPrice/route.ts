// src/app/api/fetchGoldPrice/route.ts
import { NextRequest, NextResponse } from 'next/server';
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
    const response = await axios.get(API_URL);
    const data: PriceData[] = response.data;

    // Log the response data to inspect the structure
    console.log('API response data:', JSON.stringify(data, null, 2));

    // Ensure the data structure is valid
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Invalid response structure or no data available');
    }

    // Extract the price from the "Prime" spread profile
    for (const item of data) {
      const primeProfile = item.spreadProfilePrices.find((profile) => 
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


export async function GET(_: NextRequest): Promise<NextResponse> {
  try {
    const price = await fetchGoldPrice();
    return NextResponse.json({ price });
  } catch (error) {
    console.error('Error fetching gold price:', error);
    return NextResponse.json({ error: 'Failed to fetch gold price' }, { status: 500 });
  }
}
