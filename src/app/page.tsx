'use client';

import { useEffect, useState } from 'react';

interface TradeData {
  _id: string;
  signal: string;
  stopLoss: number;
  takeProfit: number;
  currentPrice: number;
  rsi: number;
  timestamp: string;
}

export default function Home() {
  const [tradeData, setTradeData] = useState<TradeData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const res = await fetch('/api/getTrades');
        if (!res.ok) {
          throw new Error('Failed to fetch trades');
        }
        const data = await res.json();
        setTradeData(data);
        console.log('Fetched trades:', data);
      } catch (err) {
        console.error('Error fetching trades:', err);
        setError('Could not load trade data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrades();
  }, []);

  return (
    <div>
      <h1>Gold Trading Bot</h1>
      {isLoading ? (
        <p>Loading trades...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : tradeData.length > 0 ? (
        <ul>
          {tradeData.map((trade) => (
            <li key={trade._id}>
              {new Date(trade.timestamp).toLocaleString()}: {trade.signal} at {trade.currentPrice} 
              (Stop Loss: {trade.stopLoss}, Take Profit: {trade.takeProfit}, RSI: {trade.rsi})
            </li>
          ))}
        </ul>
      ) : (
        <p>No trades yet.</p>
      )}
    </div>
  );
}
