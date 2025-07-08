// import fetch from 'node-fetch';
// import WebSocket from 'ws';
// import protobuf from 'protobufjs';
// import path from 'path';

// const PROTO_PATH = path.resolve('server/proto/marketdata.proto');
// const INSTRUMENT_KEYS = ['NSE_EQ|RELIANCE']; // Use a stock for testing

// let upstoxWS = null;
// let FeedResponse = null;
// let SubscriptionRequest = null;

// const protoReady = protobuf.load(PROTO_PATH)
//   .then((root) => {
//     FeedResponse = root.lookupType('com.upstox.marketdatafeederv3udapi.rpc.proto.FeedResponse');
//     SubscriptionRequest = root.lookupType('SubscriptionRequest');
//     console.log('[UpstoxWS] Protobuf loaded successfully.');
//   })
//   .catch((err) => {
//     console.error('[UpstoxWS] Error loading proto:', err);
//   });

// export async function initMarketDataSocket(io) {
//   console.log('[UpstoxWS] Initializing market data socket relay...');

//   const accessToken = 'eyJ0eXAiOiJKV1QiLCJrZXlfaWQiOiJza192MS4wIiwiYWxnIjoiSFMyNTYifQ.eyJzdWIiOiI2NkFVVUQiLCJqdGkiOiI2ODZiNDU3ODJiOTk3NjEzZTRlNWU1ZTQiLCJpc011bHRpQ2xpZW50IjpmYWxzZSwiaXNQbHVzUGxhbiI6ZmFsc2UsImlhdCI6MTc1MTg2MDYwMCwiaXNzIjoidWRhcGktZ2F0ZXdheS1zZXJ2aWNlIiwiZXhwIjoxNzUxOTI1NjAwfQ.j9Fxoj8R-xfuHlTR09863GH6DIT6CnZu-UEdhY4a9A0'; // <-- Replace with your logic
//   if (!accessToken) {
//     console.error('[UpstoxWS] ❌ No Upstox access token available for market data WebSocket.');
//     return;
//   }

//   let wsUrl;
//   try {
//     const res = await fetch('https://api.upstox.com/v3/feed/market-data-feed/authorize', {
//       method: 'GET',
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//         Accept: 'application/json'
//       }
//     });
//     const data = await res.json();
//     wsUrl = data?.data?.authorized_redirect_uri;
//     if (!wsUrl) throw new Error('No authorized_redirect_uri in Upstox response');
//     console.log('[UpstoxWS] Authorization response:', data);
//   } catch (err) {
//     console.error('❌ [UpstoxWS] Failed to authorize Upstox Market Data WebSocket:', err);
//     return;
//   }

//   await protoReady;
//   if (!FeedResponse || !SubscriptionRequest) {
//     console.error('[UpstoxWS] Protobuf not loaded. Cannot start market data socket.');
//     return;
//   }

//   upstoxWS = new WebSocket(wsUrl);

//   upstoxWS.on('open', async () => {
//     console.log('🔗 [UpstoxWS] Upstox Market Data WebSocket connected.');

//     const payload = {
//       guid: 'guid-' + Date.now(),
//       method: 'sub',
//       data: {
//         mode: 'full',
//         instrumentKeys: INSTRUMENT_KEYS
//       }
//     };

//     try {
//       const errMsg = SubscriptionRequest.verify(payload);
//       if (errMsg) throw Error(errMsg);
//       const message = SubscriptionRequest.create(payload);
//       const buffer = SubscriptionRequest.encode(message).finish();
//       upstoxWS.send(buffer);
//       console.log('[UpstoxWS] Sent subscription request as Protobuf binary.');
//     } catch (e) {
//       console.error('[UpstoxWS] Error encoding/sending subscription request:', e);
//     }
//   });

//   upstoxWS.on('message', (msg) => {
//     // Print raw buffer info
//     console.log('---');
//     console.log(`[UpstoxWS] Raw message length: ${msg.length}`);
//     console.log(`[UpstoxWS] Raw message (hex): ${Buffer.from(msg).toString('hex')}`);

//     // Try decode
//     try {
//       const decoded = FeedResponse.decode(msg);
//       const data = FeedResponse.toObject(decoded, { enums: String, longs: String });
//       console.log('[UpstoxWS] FULL DECODED OBJECT:', JSON.stringify(data, null, 2));

//       // Print type and feeds if present
//       if (data.type) {
//         console.log(`[UpstoxWS] Type: ${data.type}`);
//       }
//       if (data.feeds) {
//         console.log('[UpstoxWS] Feeds keys:', Object.keys(data.feeds));
//       }

//       // Only emit if the instrument is present
//       const filteredFeeds = {};
//       for (const key of INSTRUMENT_KEYS) {
//         if (data.feeds && data.feeds[key]) {
//           filteredFeeds[key] = data.feeds[key];
//         }
//       }
//       if (Object.keys(filteredFeeds).length > 0) {
//         io.emit('marketData', { ...data, feeds: filteredFeeds });
//         console.log('[UpstoxWS] Emitted:', JSON.stringify(filteredFeeds, null, 2));
//       }
//     } catch (err) {
//       console.error('[UpstoxWS] ERROR DECODING PROTOBUF:', err);
//       // Optionally print the buffer as base64 for support
//       console.error('[UpstoxWS] Buffer (base64):', Buffer.from(msg).toString('base64'));
//     }
//   });

//   upstoxWS.on('close', (code, reason) => {
//     console.warn(`⚠️ [UpstoxWS] WebSocket closed. Code: ${code}, Reason: ${reason}. Reconnecting in 10s...`);
//     setTimeout(() => initMarketDataSocket(io), 10000);
//   });

//   upstoxWS.on('error', (err) => {
//     console.error('❌ [UpstoxWS] WebSocket error:', err);
//   });
// }






// routes/marketDataSocket.js
import yahooFinance from 'yahoo-finance2';

const NSE_SYMBOLS = [
  { key: '^NSEI', label: 'Nifty 50' },
  { key: '^NSEBANK', label: 'Bank Nifty' }
];

export function initMarketDataSocket(io) {
  async function fetchAndEmit() {
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
          time: (typeof quote.regularMarketTime === 'number' && quote.regularMarketTime > 0)
            ? new Date(
                quote.regularMarketTime < 1e12
                  ? quote.regularMarketTime * 1000
                  : quote.regularMarketTime
              ).toLocaleString()
            : new Date().toLocaleString(),
        };
      } catch (e) {
        results[key] = { error: 'No data', time: new Date().toLocaleString() };
      }
    }
    io.emit('indexMarketData', results);
  }

  setInterval(fetchAndEmit, 2 * 1000);
  fetchAndEmit(); // immediately on startup
}


