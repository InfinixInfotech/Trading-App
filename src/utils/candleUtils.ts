// candleUtils.ts
import type { Time } from 'lightweight-charts';


export type Candle = {
  time: Time; // UNIX timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
};

export function addOrUpdateCandle(
  candles: Candle[],
  price: number,
  timestamp: number,
  intervalSec: number = 60 // 1-minute candles
): Candle[] {
  const candleTime = Math.floor(timestamp / intervalSec) * intervalSec;
  const last = candles[candles.length - 1];
  if (!last || last.time !== candleTime) {
    // Start new candle
    return [
      ...candles,
      { time: candleTime as Time, open: price, high: price, low: price, close: price },
    ].slice(-60); // keep last 60 candles
  } else {
    // Update last candle
    return [
      ...candles.slice(0, -1),
      {
        ...last,
        high: Math.max(last.high, price),
        low: Math.min(last.low, price),
        close: price,
      },
    ];
  }
}
