// /src/utils/rsi/rsi.ts
export function calculateRSI(prices: { price: number }[]): number | null {
  if (prices.length < 14) {
      console.warn('Insufficient price data for RSI calculation');
      return null;
  }

  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < prices.length; i++) {
      const change = prices[i].price - prices[i - 1].price;
      if (change > 0) {
          gains.push(change);
          losses.push(0);
      } else {
          losses.push(Math.abs(change));
          gains.push(0);
      }
  }

  const averageGain = gains.reduce((a, b) => a + b, 0) / gains.length;
  const averageLoss = losses.reduce((a, b) => a + b, 0) / losses.length;

  if (averageLoss === 0) {
      return averageGain === 0 ? null : 100;
  }

  const relativeStrength = averageGain / averageLoss;
  const rsi = 100 - (100 / (1 + relativeStrength));

  return Math.round(rsi * 100) / 100; // Round to 2 decimal places
}
