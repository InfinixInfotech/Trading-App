// utils/candleAggregator.ts
export type Candle = {
  time: number; // Unix timestamp (seconds)
  open: number;
  high: number;
  low: number;
  close: number;
};

export function updateCandles(
  candles: Candle[],
  newPrice: number,
  timestamp: number,
  intervalSec = 60
): Candle[] {
  const last = candles[candles.length - 1];
  const candleTime = Math.floor(timestamp / intervalSec) * intervalSec;
  if (!last || last.time !== candleTime) {
    // New candle
    return [
      ...candles,
      {
        time: candleTime,
        open: newPrice,
        high: newPrice,
        low: newPrice,
        close: newPrice,
      },
    ].slice(-60); // Keep only last 60 candles (1h)
  } else {
    // Update current candle
    return [
      ...candles.slice(0, -1),
      {
        ...last,
        high: Math.max(last.high, newPrice),
        low: Math.min(last.low, newPrice),
        close: newPrice,
      },
    ];
  }
}
