import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { tradingService } from '../services/tradingService';
const CandleChart = React.lazy(() => import('./CandleChart'));
import { UTCTimestamp } from 'lightweight-charts';
import RealTimeIndexPanel from './RealTimeMarketData';


const SOCKET_URL = 'http://localhost:3001';

type Candle = {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
};

type StrategyConfig = {
  symbol: string;
  tag: string;
  expiryType: string;
  entryType: string;
  maPeriod: number;
  maMethod: string;
  maPrice: string;
  tradeType: string;
  quantity: number;
  takeProfit: number;
  stopLoss: number;
  useTrailing: boolean;
  trailingStop: number;
  maxTradesPerDay: number;
  endTime: string;
  active: boolean;
};

const AutoTradingSystem: React.FC = () => {
  // State management
  const [candles, setCandles] = useState<{ [symbol: string]: Candle[] }>({});
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BANKNIFTY');
  const [tradesToday, setTradesToday] = useState<{ [symbol: string]: number }>({});
  const [performance, setPerformance] = useState<{ [symbol: string]: { profit: number; trades: number } }>({});
  const [isConnected, setIsConnected] = useState(false);
  
  // Strategy configurations
  const [strategies, setStrategies] = useState<StrategyConfig[]>([
    {
      symbol: 'BANKNIFTY',
      tag: 'BNF-ST1',
      expiryType: 'Weekly',
      entryType: 'ITM1',
      maPeriod: 21,
      maMethod: 'EMA',
      maPrice: 'close',
      tradeType: 'Both',
      quantity: 15,
      takeProfit: 50,
      stopLoss: 30,
      useTrailing: true,
      trailingStop: 20,
      maxTradesPerDay: 10,
      endTime: '15:05',
      active: true
    },
    {
      symbol: 'NIFTY',
      tag: 'NFT-ST1',
      expiryType: 'Weekly',
      entryType: 'ITM1',
      maPeriod: 14,
      maMethod: 'SMA',
      maPrice: 'close',
      tradeType: 'Buy',
      quantity: 25,
      takeProfit: 40,
      stopLoss: 25,
      useTrailing: false,
      trailingStop: 0,
      maxTradesPerDay: 8,
      endTime: '15:10',
      active: true
    }
  ]);

  const lastTradeTimeRef = useRef<{ [symbol: string]: number }>({});
  const currentPositionsRef = useRef<{ [symbol: string]: { type: 'BUY' | 'SELL'; entryPrice: number } | null }>({});

  // Initialize socket connection
  useEffect(() => {
    const socket: Socket = io(SOCKET_URL);

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to WebSocket server');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from WebSocket server');
    });

    socket.on('priceUpdate', (data: {
      trading_symbol: string;
      open: number;
      high: number;
      low: number;
      close: number;
      timestamp: number;
    }) => {
      const { trading_symbol, open, high, low, close, timestamp } = data;
      
      setCandles(prev => {
        const updated = { ...prev };
        const current = updated[trading_symbol] || [];
        
        // Create or update candle
        const newCandle: Candle = {
          time: Math.floor(timestamp / 1000) as UTCTimestamp,
          open,
          high,
          low,
          close
        };
        
        // Keep only the last 100 candles
        updated[trading_symbol] = [...current, newCandle].slice(-100);
        return updated;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Trading logic
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      
      // Process each active strategy
      strategies.filter(s => s.active).forEach(strategy => {
        const symbolCandles = candles[strategy.symbol];
        if (!symbolCandles || symbolCandles.length < strategy.maPeriod) return;
        
        // Check trading hours
        const endParts = strategy.endTime.split(':');
        const endTime = new Date();
        endTime.setHours(Number(endParts[0]), Number(endParts[1]), 0, 0);
        
        if (now > endTime) return;
        
        // Check max trades
        if ((tradesToday[strategy.symbol] || 0) >= strategy.maxTradesPerDay) return;
        
        // Calculate indicators
        const maValue = calculateMA(symbolCandles, strategy.maPeriod, strategy.maMethod);
        const latestPrice = symbolCandles[symbolCandles.length - 1].close;
        
        // Get current position
        const currentPosition = currentPositionsRef.current[strategy.symbol];
        
        // Strategy-specific logic
        if (strategy.symbol === 'BANKNIFTY') {
          handleBankNiftyStrategy(strategy, latestPrice, maValue, currentPosition);
        } else if (strategy.symbol === 'NIFTY') {
          handleNiftyStrategy(strategy, latestPrice, maValue, currentPosition);
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [candles, strategies, tradesToday]);

  const handleBankNiftyStrategy = (
    strategy: StrategyConfig,
    price: number,
    maValue: number,
    currentPosition: { type: 'BUY' | 'SELL'; entryPrice: number } | null
  ) => {
    // Entry logic
    if (!currentPosition) {
      if (price > maValue && (strategy.tradeType === 'Buy' || strategy.tradeType === 'Both')) {
        placeOrder(strategy, 'BUY', price);
      } else if (price < maValue && (strategy.tradeType === 'Sell' || strategy.tradeType === 'Both')) {
        placeOrder(strategy, 'SELL', price);
      }
    } 
    // Exit logic
    else {
      const isBuy = currentPosition.type === 'BUY';
      const profit = isBuy ? price - currentPosition.entryPrice : currentPosition.entryPrice - price;
      
      // Take profit or stop loss
      if ((isBuy && profit >= strategy.takeProfit) || (!isBuy && profit >= strategy.takeProfit)) {
        placeOrder(strategy, isBuy ? 'SELL' : 'BUY', price);
      } else if ((isBuy && profit <= -strategy.stopLoss) || (!isBuy && profit <= -strategy.stopLoss)) {
        placeOrder(strategy, isBuy ? 'SELL' : 'BUY', price);
      }
      // Trailing stop
      else if (strategy.useTrailing) {
        const highestProfit = isBuy 
          ? price - currentPosition.entryPrice
          : currentPosition.entryPrice - price;
        
        if (highestProfit - profit >= strategy.trailingStop) {
          placeOrder(strategy, isBuy ? 'SELL' : 'BUY', price);
        }
      }
    }
  };

  const handleNiftyStrategy = (
    strategy: StrategyConfig,
    price: number,
    maValue: number,
    currentPosition: { type: 'BUY' | 'SELL'; entryPrice: number } | null
  ) => {
    // Different logic for Nifty
    const rsi = calculateRSI(candles[strategy.symbol], 14);
    
    if (!currentPosition) {
      if (price > maValue && rsi < 70 && strategy.tradeType === 'Buy') {
        placeOrder(strategy, 'BUY', price);
      }
    } else {
      const profit = price - currentPosition.entryPrice;
      if (profit >= strategy.takeProfit || rsi > 70) {
        placeOrder(strategy, 'SELL', price);
      } else if (profit <= -strategy.stopLoss) {
        placeOrder(strategy, 'SELL', price);
      }
    }
  };

  const calculateMA = (data: Candle[], period: number, method: string): number => {
    const slice = data.slice(-period);
    if (method === 'EMA') {
      // Exponential Moving Average calculation
      const multiplier = 2 / (period + 1);
      let ema = slice[0].close;
      for (let i = 1; i < slice.length; i++) {
        ema = (slice[i].close - ema) * multiplier + ema;
      }
      return ema;
    } else {
      // Simple Moving Average
      const sum = slice.reduce((acc, c) => acc + c.close, 0);
      return sum / period;
    }
  };

  const calculateRSI = (data: Candle[], period: number): number => {
    if (!data || data.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = data[i].close - data[i - 1].close;
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  };

  const placeOrder = async (strategy: StrategyConfig, type: 'BUY' | 'SELL', price: number) => {
    try {
      const instrument_token = `TOKEN_${strategy.symbol}_${strategy.entryType}`;
      
      await tradingService.placeOrder({
        trading_symbol: strategy.symbol,
        instrument_token,
        quantity: strategy.quantity,
        price: price,
        order_type: 'MARKET',
        transaction_type: type,
        product: 'I',
        validity: 'DAY',
        tag: strategy.tag
      });
      
      // Update position
      if (type === 'BUY' || type === 'SELL') {
        currentPositionsRef.current[strategy.symbol] = { type, entryPrice: price };
      } else {
        // This was an exit trade
        const entry = currentPositionsRef.current[strategy.symbol];
        if (entry) {
          const profit = type === 'SELL' 
            ? price - entry.entryPrice 
            : entry.entryPrice - price;
          
          setPerformance(prev => ({
            ...prev,
            [strategy.symbol]: {
              profit: (prev[strategy.symbol]?.profit || 0) + profit,
              trades: (prev[strategy.symbol]?.trades || 0) + 1
            }
          }));
        }
        currentPositionsRef.current[strategy.symbol] = null;
      }
      
      // Update trade count
      setTradesToday(prev => ({
        ...prev,
        [strategy.symbol]: (prev[strategy.symbol] || 0) + 1
      }));
      
      console.log(`✅ ${type} order placed for ${strategy.symbol} at ₹${price}`);
    } catch (err) {
      console.error(`❌ Failed to place ${type} order:`, err);
    }
  };

  const toggleStrategy = (index: number) => {
    setStrategies(prev => {
      const updated = [...prev];
      updated[index].active = !updated[index].active;
      return updated;
    });
  };

  const updateStrategy = (index: number, field: string, value: any) => {
    setStrategies(prev => {
      const updated = [...prev];
      (updated[index] as any)[field] = value;
      return updated;
    });
  };

  const addNewStrategy = () => {
    setStrategies(prev => [
      ...prev,
      {
        symbol: 'BANKNIFTY',
        tag: `BNF-ST${strategies.length + 1}`,
        expiryType: 'Weekly',
        entryType: 'ITM1',
        maPeriod: 20,
        maMethod: 'EMA',
        maPrice: 'close',
        tradeType: 'Both',
        quantity: 15,
        takeProfit: 50,
        stopLoss: 30,
        useTrailing: true,
        trailingStop: 20,
        maxTradesPerDay: 10,
        endTime: '15:05',
        active: true
      }
    ]);
  };

  return (
    <div style={{
      padding: 24,
      maxWidth: 1200,
      margin: '32px auto',
      background: '#181818',
      borderRadius: 12,
      boxShadow: '0 2px 12px #000a',
      fontFamily: 'monospace',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
      }}>
        <h2 style={{ color: '#fff', margin: 0 }}>
          📈 Multi-Strategy Auto Trading System
        </h2>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <div style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: isConnected ? '#4caf50' : '#f44336',
          }} />
          <span style={{ color: isConnected ? '#4caf50' : '#f44336' }}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 2fr',
        gap: 20,
      }}>
        {/* Strategy Configuration */}
        <div style={{
          background: '#252525',
          borderRadius: 8,
          padding: 16,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}>
            <h3 style={{ color: '#fff', margin: 0, fontSize: 18 }}>Strategies</h3>
            <button
              onClick={addNewStrategy}
              style={{
                background: '#4caf50',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              + Add Strategy
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {strategies.map((strategy, index) => (
              <div key={index} style={{
                background: strategy.active ? '#1a2e22' : '#252525',
                padding: 12,
                borderRadius: 6,
                border: `1px solid ${strategy.active ? '#4caf50' : '#444'}`,
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}>
                  <span style={{ 
                    color: strategy.active ? '#4caf50' : '#aaa',
                    fontWeight: 'bold',
                  }}>
                    {strategy.symbol} - {strategy.tag}
                  </span>
                  <button
                    onClick={() => toggleStrategy(index)}
                    style={{
                      background: strategy.active ? '#f44336' : '#4caf50',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    {strategy.active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 8,
                  fontSize: 12,
                }}>
                  <div>
                    <label style={{ display: 'block', color: '#aaa', marginBottom: 4 }}>Symbol</label>
                    <select
                      value={strategy.symbol}
                      onChange={(e) => updateStrategy(index, 'symbol', e.target.value)}
                      style={{
                        width: '100%',
                        background: '#333',
                        border: '1px solid #444',
                        color: '#fff',
                        padding: '4px 8px',
                        borderRadius: 4,
                      }}
                    >
                      <option value="BANKNIFTY">BANKNIFTY</option>
                      <option value="NIFTY">NIFTY</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#aaa', marginBottom: 4 }}>MA Method</label>
                    <select
                      value={strategy.maMethod}
                      onChange={(e) => updateStrategy(index, 'maMethod', e.target.value)}
                      style={{
                        width: '100%',
                        background: '#333',
                        border: '1px solid #444',
                        color: '#fff',
                        padding: '4px 8px',
                        borderRadius: 4,
                      }}
                    >
                      <option value="EMA">EMA</option>
                      <option value="SMA">SMA</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#aaa', marginBottom: 4 }}>MA Period</label>
                    <input
                      type="number"
                      value={strategy.maPeriod}
                      onChange={(e) => updateStrategy(index, 'maPeriod', parseInt(e.target.value))}
                      style={{
                        width: '100%',
                        background: '#333',
                        border: '1px solid #444',
                        color: '#fff',
                        padding: '4px 8px',
                        borderRadius: 4,
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#aaa', marginBottom: 4 }}>Trade Type</label>
                    <select
                      value={strategy.tradeType}
                      onChange={(e) => updateStrategy(index, 'tradeType', e.target.value)}
                      style={{
                        width: '100%',
                        background: '#333',
                        border: '1px solid #444',
                        color: '#fff',
                        padding: '4px 8px',
                        borderRadius: 4,
                      }}
                    >
                      <option value="Buy">Buy Only</option>
                      <option value="Sell">Sell Only</option>
                      <option value="Both">Both</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#aaa', marginBottom: 4 }}>Qty</label>
                    <input
                      type="number"
                      value={strategy.quantity}
                      onChange={(e) => updateStrategy(index, 'quantity', parseInt(e.target.value))}
                      style={{
                        width: '100%',
                        background: '#333',
                        border: '1px solid #444',
                        color: '#fff',
                        padding: '4px 8px',
                        borderRadius: 4,
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#aaa', marginBottom: 4 }}>TP</label>
                    <input
                      type="number"
                      value={strategy.takeProfit}
                      onChange={(e) => updateStrategy(index, 'takeProfit', parseInt(e.target.value))}
                      style={{
                        width: '100%',
                        background: '#333',
                        border: '1px solid #444',
                        color: '#fff',
                        padding: '4px 8px',
                        borderRadius: 4,
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#aaa', marginBottom: 4 }}>SL</label>
                    <input
                      type="number"
                      value={strategy.stopLoss}
                      onChange={(e) => updateStrategy(index, 'stopLoss', parseInt(e.target.value))}
                      style={{
                        width: '100%',
                        background: '#333',
                        border: '1px solid #444',
                        color: '#fff',
                        padding: '4px 8px',
                        borderRadius: 4,
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#aaa', marginBottom: 4 }}>Trailing SL</label>
                    <input
                      type="number"
                      value={strategy.trailingStop}
                      onChange={(e) => updateStrategy(index, 'trailingStop', parseInt(e.target.value))}
                      disabled={!strategy.useTrailing}
                      style={{
                        width: '100%',
                        background: !strategy.useTrailing ? '#222' : '#333',
                        border: '1px solid #444',
                        color: !strategy.useTrailing ? '#666' : '#fff',
                        padding: '4px 8px',
                        borderRadius: 4,
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="checkbox"
                        checked={strategy.useTrailing}
                        onChange={(e) => updateStrategy(index, 'useTrailing', e.target.checked)}
                        style={{
                          width: 16,
                          height: 16,
                        }}
                      />
                      <span style={{ color: '#aaa', fontSize: 12 }}>Use Trailing</span>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Chart View */}
        <div style={{
          background: '#252525',
          borderRadius: 8,
          padding: 0,
        }}>          
          <div>
              <div style={{ borderRadius: 8, padding: 8 }}>
                <RealTimeIndexPanel/>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoTradingSystem;