import axios from 'axios';
import { Strategy } from '../pages/StrategyPage';

const API_URL = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem('upstox_token');
  return { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
};

export const strategyService = {
  getStrategies: async (): Promise<Strategy[]> => {
    try {
      const response = await axios.get(`${API_URL}/strategies`, {
        headers: getAuthHeaders()
      });
      return response.data.strategies;
    } catch (error) {
      console.error('Failed to fetch strategies:', error);
      // Return mock data for development
      return [
        {
          id: 'ema_crossover_1',
          name: 'EMA Crossover NIFTY',
          type: 'ema_crossover',
          symbol: 'NIFTY',
          enabled: false,
          parameters: {
            fastPeriod: 9,
            slowPeriod: 21,
            quantity: 25,
            stopLoss: 2.0,
            takeProfit: 4.0,
            trailingStop: true
          },
          performance: {
            totalTrades: 45,
            winRate: 62.2,
            totalPnL: 12450.50,
            maxDrawdown: -3200.00,
            sharpeRatio: 1.35
          },
          lastSignal: {
            action: 'BUY',
            timestamp: Date.now() - 300000,
            price: 19450.25,
            confidence: 85
          }
        },
        {
          id: 'rsi_oversold_1',
          name: 'RSI Oversold BANKNIFTY',
          type: 'rsi_oversold',
          symbol: 'BANKNIFTY',
          enabled: true,
          parameters: {
            rsiPeriod: 14,
            oversoldLevel: 30,
            overboughtLevel: 70,
            quantity: 15,
            stopLoss: 1.5,
            takeProfit: 3.0
          },
          performance: {
            totalTrades: 32,
            winRate: 68.8,
            totalPnL: 8750.25,
            maxDrawdown: -2100.00,
            sharpeRatio: 1.52
          },
          lastSignal: {
            action: 'SELL',
            timestamp: Date.now() - 600000,
            price: 45125.75,
            confidence: 78
          }
        },
        {
          id: 'sma_trend_1',
          name: 'SMA Trend RELIANCE',
          type: 'sma_trend',
          symbol: 'RELIANCE',
          enabled: false,
          parameters: {
            shortPeriod: 20,
            longPeriod: 50,
            trendStrength: 1.2,
            quantity: 50,
            stopLoss: 2.5,
            takeProfit: 5.0
          },
          performance: {
            totalTrades: 28,
            winRate: 57.1,
            totalPnL: 5680.75,
            maxDrawdown: -1850.00,
            sharpeRatio: 0.95
          }
        },
        {
          id: 'bollinger_bands_1',
          name: 'Bollinger Bands TCS',
          type: 'bollinger_bands',
          symbol: 'TCS',
          enabled: false,
          parameters: {
            period: 20,
            stdDev: 2.0,
            quantity: 30,
            stopLoss: 1.8,
            takeProfit: 3.5,
            meanReversion: true
          },
          performance: {
            totalTrades: 38,
            winRate: 65.8,
            totalPnL: 9320.40,
            maxDrawdown: -2450.00,
            sharpeRatio: 1.28
          }
        }
      ];
    }
  },

  updateStrategy: async (strategyId: string, updates: Partial<Strategy>) => {
    try {
      const response = await axios.put(`${API_URL}/strategies/${strategyId}`, updates, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Failed to update strategy:', error);
      // Mock success for development
      return { success: true };
    }
  },

  getSystemStatus: async () => {
    try {
      const response = await axios.get(`${API_URL}/strategies/system/status`, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch system status:', error);
      // Return mock status
      return {
        status: 'stopped',
        autoTradingEnabled: false,
        logs: [
          '[12:30:45] System initialized',
          '[12:30:46] Loading strategies...',
          '[12:30:47] 4 strategies loaded',
          '[12:30:48] Market data connection established',
          '[12:30:49] Ready for trading'
        ]
      };
    }
  },

  setAutoTrading: async (enabled: boolean) => {
    try {
      const response = await axios.post(`${API_URL}/strategies/system/auto-trading`, 
        { enabled }, 
        { headers: getAuthHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to set auto trading:', error);
      // Mock success for development
      return { success: true };
    }
  },

  getMarketData: async (symbols: string[]) => {
    try {
      const response = await axios.post(`${API_URL}/strategies/market-data`, 
        { symbols }, 
        { headers: getAuthHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch market data:', error);
      // Return mock market data
      const mockData: Record<string, any> = {};
      symbols.forEach(symbol => {
        const basePrice = symbol === 'NIFTY' ? 19450 : 
                         symbol === 'BANKNIFTY' ? 45125 :
                         symbol === 'RELIANCE' ? 2475 : 3650;
        
        mockData[symbol] = {
          price: basePrice + (Math.random() - 0.5) * 100,
          open: basePrice - 50,
          high: basePrice + 75,
          low: basePrice - 75,
          change: (Math.random() - 0.5) * 200,
          volume: Math.floor(Math.random() * 1000000),
          timestamp: Date.now()
        };
      });
      return mockData;
    }
  },

  getChartData: async (symbol: string, strategyType: string) => {
    try {
      const response = await axios.get(`${API_URL}/strategies/chart-data/${symbol}/${strategyType}`, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
      
      // Generate mock chart data
      const now = Math.floor(Date.now() / 1000);
      const candles = [];
      const indicators: Record<string, any[]> = {};
      const signals = [];
      
      let basePrice = symbol === 'NIFTY' ? 19450 : 
                     symbol === 'BANKNIFTY' ? 45125 :
                     symbol === 'RELIANCE' ? 2475 : 3650;

      // Generate 100 candles (last 100 minutes)
      for (let i = 99; i >= 0; i--) {
        const time = now - (i * 60);
        const volatility = basePrice * 0.002;
        const change = (Math.random() - 0.5) * volatility;
        
        const open = basePrice;
        const close = basePrice + change;
        const high = Math.max(open, close) + Math.random() * volatility * 0.5;
        const low = Math.min(open, close) - Math.random() * volatility * 0.5;
        
        candles.push({
          time,
          open,
          high,
          low,
          close
        });
        
        basePrice = close;
      }

      // Generate indicators based on strategy type
      switch (strategyType) {
        case 'ema_crossover':
          indicators.ema9 = candles.map((candle, index) => ({
            time: candle.time,
            value: candles.slice(Math.max(0, index - 8), index + 1)
              .reduce((sum, c) => sum + c.close, 0) / Math.min(9, index + 1)
          }));
          indicators.ema21 = candles.map((candle, index) => ({
            time: candle.time,
            value: candles.slice(Math.max(0, index - 20), index + 1)
              .reduce((sum, c) => sum + c.close, 0) / Math.min(21, index + 1)
          }));
          break;
          
        case 'sma_trend':
          indicators.sma20 = candles.map((candle, index) => ({
            time: candle.time,
            value: candles.slice(Math.max(0, index - 19), index + 1)
              .reduce((sum, c) => sum + c.close, 0) / Math.min(20, index + 1)
          }));
          indicators.sma50 = candles.map((candle, index) => ({
            time: candle.time,
            value: candles.slice(Math.max(0, index - 49), index + 1)
              .reduce((sum, c) => sum + c.close, 0) / Math.min(50, index + 1)
          }));
          break;
          
        case 'bollinger_bands':
          const period = 20;
          indicators.bbUpper = [];
          indicators.bbMiddle = [];
          indicators.bbLower = [];
          
          candles.forEach((candle, index) => {
            if (index >= period - 1) {
              const slice = candles.slice(index - period + 1, index + 1);
              const sma = slice.reduce((sum, c) => sum + c.close, 0) / period;
              const variance = slice.reduce((sum, c) => sum + Math.pow(c.close - sma, 2), 0) / period;
              const stdDev = Math.sqrt(variance);
              
              indicators.bbUpper.push({ time: candle.time, value: sma + (2 * stdDev) });
              indicators.bbMiddle.push({ time: candle.time, value: sma });
              indicators.bbLower.push({ time: candle.time, value: sma - (2 * stdDev) });
            }
          });
          break;
      }

      // Generate some random signals
      for (let i = 0; i < 5; i++) {
        const randomIndex = Math.floor(Math.random() * candles.length);
        const candle = candles[randomIndex];
        const action = Math.random() > 0.5 ? 'BUY' : 'SELL';
        
        signals.push({
          time: candle.time,
          position: action === 'BUY' ? 'belowBar' : 'aboveBar',
          color: action === 'BUY' ? '#10b981' : '#ef4444',
          shape: action === 'BUY' ? 'arrowUp' : 'arrowDown',
          text: action
        });
      }

      return { candles, indicators, signals };
    }
  }
};