// routes/marketData.js
import express from 'express';
import yahooFinance from 'yahoo-finance2';

const router = express.Router();

const NSE_SYMBOLS = [
  { key: '^NSEI', label: 'Nifty 50' },
  { key: '^NSEBANK', label: 'Bank Nifty' }
];

router.get('/marketdata', async (req, res) => {
  try {
    const results = {};
    for (const { key, label } of NSE_SYMBOLS) {
      try {
        const quote = await yahooFinance.quote(key);
        results[key] = {
          label,
          price: quote.regularMarketPrice,
          open: quote.regularMarketOpen,
          high: quote.regularMarketDayHigh,
          low: quote.regularMarketDayLow,
          prevClose: quote.regularMarketPreviousClose,
          change: quote.regularMarketChange,
          changePercent: quote.regularMarketChangePercent,
          time: quote.regularMarketTime
            ? new Date(quote.regularMarketTime * 1000).toLocaleString()
            : '',
        };
      } catch (e) {
        results[key] = { error: 'No data' };
      }
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch market data' });
  }
});

export default router;
