import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import CandleChart from './CandleChart';
import { addOrUpdateCandle, Candle } from '../utils/candleUtils';
import { tradingService } from '../services/tradingService';

const SOCKET_URL = 'http://localhost:3001';

type IndexData = {
  label?: string;
  price?: number;
  open?: number;
  high?: number;
  low?: number;
  prevClose?: number;
  change?: number;
  changePercent?: number;
  time?: string;
  error?: string;
};

type IndexDataMap = { [key: string]: IndexData };

const SYMBOLS = [
  { key: '^NSEI', label: 'Nifty 50' },
  { key: '^NSEBANK', label: 'Bank Nifty' },
];

const RealTimeIndexPanel: React.FC = () => {
  const [data, setData] = useState<IndexDataMap>({});
  const [candles, setCandles] = useState<{ [key: string]: Candle[] }>({});
  const [activeTab, setActiveTab] = useState(0);

  const lastTradeTimeRef = useRef<{ [key: string]: number }>({});

  useEffect(() => {
    const socket: Socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    socket.on('indexMarketData', (marketData: IndexDataMap) => {
      setData(marketData);
      const now = Math.floor(Date.now() / 1000);
      setCandles((prev) => {
        const updated = { ...prev };
        for (const { key } of SYMBOLS) {
          const d = marketData[key];
          if (d && d.price && !d.error) {
            updated[key] = addOrUpdateCandle(prev[key] || [], d.price, now, 60);
          }
        }
        return updated;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const activeSymbol = SYMBOLS[activeTab].key;
    const currentCandles = candles[activeSymbol];

    if (!currentCandles || currentCandles.length < 2) return;

    const latest = currentCandles[currentCandles.length - 1];
    const prev = currentCandles[currentCandles.length - 2];

    const priceChangePercent = ((latest.close - prev.close) / prev.close) * 100;

    const now = Date.now();
    const lastTradeTime = lastTradeTimeRef.current[activeSymbol] || 0;

    if (now - lastTradeTime < 60000) return;

    if (priceChangePercent > 0.5) {
      console.log(`📈 BUY ${activeSymbol} at ${latest.close} (+${priceChangePercent.toFixed(2)}%)`);

      tradingService.placeOrder({
        trading_symbol: activeSymbol,
        quantity: 1,
        transaction_type: 'BUY',
        price: latest.close,
        order_type: 'MARKET',
        product: 'MIS',
      });

      lastTradeTimeRef.current[activeSymbol] = now;
    } else if (priceChangePercent < -0.5) {
      console.log(`📉 SELL ${activeSymbol} at ${latest.close} (${priceChangePercent.toFixed(2)}%)`);

      tradingService.placeOrder({
        trading_symbol: activeSymbol,
        quantity: 1,
        transaction_type: 'SELL',
        price: latest.close,
        order_type: 'MARKET',
        product: 'MIS',
      });

      lastTradeTimeRef.current[activeSymbol] = now;
    }

  }, [candles, activeTab]);

  const { key, label } = SYMBOLS[activeTab];
  const d = data[key];

  return (
    <div style={{
      padding: 0,
      maxWidth: 900,
      background: '#181818',
      borderRadius: 12,
      fontFamily: 'monospace',
    }}>


      <div style={{
        display: 'flex',
        borderBottom: '2px solid #333',
        margin: '0 24px',
        marginBottom: 0,
      }}>
        {SYMBOLS.map((sym, idx) => (
          <button
            key={sym.key}
            onClick={() => setActiveTab(idx)}
            style={{
              background: activeTab === idx ? '#252525' : 'transparent',
              color: activeTab === idx ? '#4caf50' : '#ccc',
              border: 'none',
              borderBottom: activeTab === idx ? '3px solid #4caf50' : '3px solid transparent',
              padding: '16px 32px 12px 32px',
              fontWeight: 'bold',
              fontSize: 18,
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none',
            }}
          >
            {sym.label}
          </button>
        ))}
      </div>

      <div style={{
        padding: 24,
        background: '#252525',
        borderRadius: '0 0 12px 12px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}>
          <div style={{ fontWeight: 'bold', fontSize: 20, color: '#fff' }}>{label}</div>
          {d && !d.error ? (
            <div style={{ color: '#4caf50', fontSize: 26, fontWeight: 700 }}>
              {d.price}
              <span style={{
                fontSize: 16,
                marginLeft: 16,
                color: d.change! >= 0 ? '#4caf50' : '#f44336'
              }}>
                {d.change! >= 0 ? '▲' : '▼'} {d.change} ({d.changePercent}%)
              </span>
            </div>
          ) : (
            <div style={{ color: '#888' }}>No data available</div>
          )}
        </div>
        <div style={{ background: '#181818', borderRadius: 8, padding: 8 }}>
          <CandleChart candles={candles[key] || []} />
        </div>
      </div>
    </div>
  );
};

export default RealTimeIndexPanel;
