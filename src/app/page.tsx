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

// Define a type for the log response from the API
interface LogEntry {
  message: string;
  timestamp: string;
}

export default function Home() {
  const [tradeData, setTradeData] = useState<TradeData[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
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
    
        // Sort trades by timestamp in descending order so the most recent trade is on top
        const sortedData = data.sort((a: TradeData, b: TradeData) => {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
    
        setTradeData(sortedData);
        console.log('Fetched trades:', sortedData);
      } catch (err) {
        console.error('Error fetching trades:', err);
        setError('Could not load trade data.');
      } finally {
        setIsLoading(false);
      }
    };
    

    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/getLogs');
        if (!res.ok) {
          throw new Error('Failed to fetch logs');
        }
        const data = await res.json();
        console.log('Fetched logs:', data);

        // Map and transform data based on the structure of the response
        const transformedLogs: LogEntry[] = data.map((log: LogEntry) => ({
          message: log.message,
          timestamp: log.timestamp,
        }));

        // Set the logs in reverse order to show the most recent first
        setLogs(transformedLogs.reverse());
      } catch (err) {
        console.error('Error fetching logs:', err);
        setError('Could not load log data.');
      }
    };

    fetchTrades();
    fetchLogs();

    const interval = setInterval(fetchLogs, 60000);

    return () => clearInterval(interval);
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

      <h2>Trade Bot Logs</h2>
      {logs.length > 0 ? (
        <ul>
          {logs.slice(0, 5).map((log, index) => (
            <li key={index}>
              {`${new Date(log.timestamp).toLocaleString()} - ${log.message}`}
            </li>
          ))}
        </ul>
      ) : (
        <p>No logs available yet.</p>
      )}
    </div>
  );
}
