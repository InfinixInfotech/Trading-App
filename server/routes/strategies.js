import express from 'express';
import cron from 'node-cron';
import yahooFinance from 'yahoo-finance2';
import { authenticateToken } from '../middleware/auth.js';
import { io } from '../index.js';
import { tradingService } from './trading.js';

const router = express.Router();

// In-memory storage for strategies and system state
let strategies = new Map();
let systemStatus = {
  status: 'stopped',
  autoTradingEnabled: false,
  logs: []
};

// Market data cache
let marketDataCache = new Map();

// Technical Analysis Functions
const calculateEMA = (prices, period) => {
  const multiplier = 2 / (period + 1);
  let ema = prices[0];
  const result = [ema];
  
  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
    result.push(ema);
  }
  
  return result;
};

const calculateSMA = (prices, period) => {
  const result = [];
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
};

const calculateRSI = (prices, period = 14) => {
  const gains = [];
  const losses = [];
  
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  const avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

const calculateBollingerBands = (prices, period = 20, stdDev = 2) => {
  const sma = calculateSMA(prices, period);
  const bands = [];
  
  for (let i = 0; i < sma.length; i++) {
    const slice = prices.slice(i, i + period);
    const mean = sma[i];
    const variance = slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    bands.push({
      upper: mean + (stdDev * standardDeviation),
      middle: mean,
      lower: mean - (stdDev * standardDeviation)
    });
  }
  
  return bands;
};

// Strategy evaluation functions
const evaluateEMACrossover = (prices, parameters) => {
  if (prices.length < parameters.slowPeriod) return { action: 'HOLD', confidence: 0 };
  
  const fastEMA = calculateEMA(prices, parameters.fastPeriod);
  const slowEMA = calculateEMA(prices, parameters.slowPeriod);
  
  const currentFast = fastEMA[fastEMA.length - 1];
  const currentSlow = slowEMA[slowEMA.length - 1];
  const prevFast = fastEMA[fastEMA.length - 2];
  const prevSlow = slowEMA[slowEMA.length - 2];
  
  // Crossover detection
  if (prevFast <= prevSlow && currentFast > currentSlow) {
    return { action: 'BUY', confidence: 85 };
  } else if (prevFast >= prevSlow && currentFast < currentSlow) {
    return { action: 'SELL', confidence: 85 };
  }
  
  return { action: 'HOLD', confidence: 0 };
};

const evaluateRSIOversold = (prices, parameters) => {
  if (prices.length < parameters.rsiPeriod + 1) return { action: 'HOLD', confidence: 0 };
  
  const rsi = calculateRSI(prices, parameters.rsiPeriod);
  
  if (rsi <= parameters.oversoldLevel) {
    return { action: 'BUY', confidence: Math.max(60, 100 - rsi) };
  } else if (rsi >= parameters.overboughtLevel) {
    return { action: 'SELL', confidence: Math.max(60, rsi - 50) };
  }
  
  return { action: 'HOLD', confidence: 0 };
};

const evaluateSMATrend = (prices, parameters) => {
  if (prices.length < parameters.longPeriod) return { action: 'HOLD', confidence: 0 };
  
  const shortSMA = calculateSMA(prices, parameters.shortPeriod);
  const longSMA = calculateSMA(prices, parameters.longPeriod);
  
  const currentShort = shortSMA[shortSMA.length - 1];
  const currentLong = longSMA[longSMA.length - 1];
  const currentPrice = prices[prices.length - 1];
  
  const trendStrength = Math.abs(currentShort - currentLong) / currentPrice;
  
  if (currentShort > currentLong && trendStrength > parameters.trendStrength / 100) {
    return { action: 'BUY', confidence: Math.min(90, 60 + (trendStrength * 1000)) };
  } else if (currentShort < currentLong && trendStrength > parameters.trendStrength / 100) {
    return { action: 'SELL', confidence: Math.min(90, 60 + (trendStrength * 1000)) };
  }
  
  return { action: 'HOLD', confidence: 0 };
};

const evaluateBollingerBands = (prices, parameters) => {
  if (prices.length < parameters.period) return { action: 'HOLD', confidence: 0 };
  
  const bands = calculateBollingerBands(prices, parameters.period, parameters.stdDev);
  const currentBand = bands[bands.length - 1];
  const currentPrice = prices[prices.length - 1];
  
  if (parameters.meanReversion) {
    if (currentPrice <= currentBand.lower) {
      return { action: 'BUY', confidence: 80 };
    } else if (currentPrice >= currentBand.upper) {
      return { action: 'SELL', confidence: 80 };
    }
  } else {
    // Breakout strategy
    if (currentPrice > currentBand.upper) {
      return { action: 'BUY', confidence: 75 };
    } else if (currentPrice < currentBand.lower) {
      return { action: 'SELL', confidence: 75 };
    }
  }
  
  return { action: 'HOLD', confidence: 0 };
};

// Market data fetching
const fetchMarketData = async (symbol) => {
  try {
    const quote = await yahooFinance.quote(symbol);
    return {
      price: quote.regularMarketPrice,
      open: quote.regularMarketOpen,
      high: quote.regularMarketDayHigh,
      low: quote.regularMarketDayLow,
      volume: quote.regularMarketVolume,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error(`Failed to fetch data for ${symbol}:`, error);
    return null;
  }
};

// Historical price data (simplified - in production, use proper historical data)
const priceHistory = new Map();

const addToHistory = (symbol, price) => {
  if (!priceHistory.has(symbol)) {
    priceHistory.set(symbol, []);
  }
  
  const history = priceHistory.get(symbol);
  history.push(price);
  
  // Keep only last 200 prices
  if (history.length > 200) {
    history.shift();
  }
};

// Strategy evaluation
const evaluateStrategy = (strategy) => {
  const history = priceHistory.get(strategy.symbol);
  if (!history || history.length < 20) return null;
  
  let signal = null;
  
  switch (strategy.type) {
    case 'ema_crossover':
      signal = evaluateEMACrossover(history, strategy.parameters);
      break;
    case 'rsi_oversold':
      signal = evaluateRSIOversold(history, strategy.parameters);
      break;
    case 'sma_trend':
      signal = evaluateSMATrend(history, strategy.parameters);
      break;
    case 'bollinger_bands':
      signal = evaluateBollingerBands(history, strategy.parameters);
      break;
  }
  
  if (signal && signal.action !== 'HOLD') {
    return {
      ...signal,
      timestamp: Date.now(),
      price: history[history.length - 1]
    };
  }
  
  return null;
};

// Auto trading logic
const executeAutoTrading = async (req) => {
  if (!systemStatus.autoTradingEnabled) return;
  
  const activeStrategies = Array.from(strategies.values()).filter(s => s.enabled);
  
  for (const strategy of activeStrategies) {
    try {
      // Fetch latest market data
      const marketData = await fetchMarketData(strategy.symbol);
      if (!marketData) continue;
      
      // Update price history
      addToHistory(strategy.symbol, marketData.price);
      marketDataCache.set(strategy.symbol, marketData);
      
      // Evaluate strategy
      const signal = evaluateStrategy(strategy);
      
      if (signal && signal.confidence >= 70) {
        // Update strategy with last signal
        strategy.lastSignal = signal;
        
        // Log the signal
        const logMessage = `[${new Date().toLocaleTimeString()}] ${strategy.name}: ${signal.action} signal at ₹${signal.price.toFixed(2)} (${signal.confidence}% confidence)`;
        systemStatus.logs.push(logMessage);
        
        // Keep only last 100 logs
        if (systemStatus.logs.length > 100) {
          systemStatus.logs.shift();
        }
        
        // 🚀 REAL TRADE EXECUTION - Place actual trade within 2 minutes
        try {
          const tradeResult = await executeRealTrade(strategy, signal);
          if (tradeResult.success) {
            const tradeLogMessage = `[${new Date().toLocaleTimeString()}] ✅ REAL TRADE EXECUTED: ${signal.action} ${strategy.parameters.quantity} ${strategy.symbol} at ₹${signal.price.toFixed(2)} - Order ID: ${tradeResult.orderId}`;
            systemStatus.logs.push(tradeLogMessage);
            console.log(`🎯 ${tradeLogMessage}`);
            
            // Update performance with real trade
            strategy.performance.totalTrades++;
            
            // Emit real trade notification
            io.emit('real_trade_executed', {
              strategy: strategy.name,
              symbol: strategy.symbol,
              action: signal.action,
              quantity: strategy.parameters.quantity,
              price: signal.price,
              orderId: tradeResult.orderId,
              timestamp: signal.timestamp
            });
          } else {
            const errorLogMessage = `[${new Date().toLocaleTimeString()}] ❌ TRADE FAILED: ${strategy.name} - ${tradeResult.error}`;
            systemStatus.logs.push(errorLogMessage);
            console.error(`❌ ${errorLogMessage}`);
          }
        } catch (tradeError) {
          const errorLogMessage = `[${new Date().toLocaleTimeString()}] ❌ TRADE ERROR: ${strategy.name} - ${tradeError.message}`;
          systemStatus.logs.push(errorLogMessage);
          console.error(`❌ ${errorLogMessage}`);
        }
        
        // Emit signal to connected clients
        io.emit('trading_signal', {
          strategy: strategy.name,
          symbol: strategy.symbol,
          action: signal.action,
          price: signal.price,
          confidence: signal.confidence,
          timestamp: signal.timestamp
        });
        
      }
      
    } catch (error) {
      console.error(`Error processing strategy ${strategy.name}:`, error);
      systemStatus.logs.push(`[${new Date().toLocaleTimeString()}] Error in ${strategy.name}: ${error.message}`);
    }
  }
};

// 🎯 REAL TRADE EXECUTION FUNCTION
const executeRealTrade = async (strategy, signal) => {
  try {
    console.log(`🚀 Executing REAL TRADE for ${strategy.name}:`);
    console.log(`   Symbol: ${strategy.symbol}`);
    console.log(`   Action: ${signal.action}`);
    console.log(`   Quantity: ${strategy.parameters.quantity}`);
    console.log(`   Price: ₹${signal.price.toFixed(2)}`);
    console.log(`   Confidence: ${signal.confidence}%`);
    
    // Convert Yahoo Finance symbol to Upstox instrument token
    const instrumentToken = getInstrumentToken(strategy.symbol);
    const tradingSymbol = getTradingSymbol(strategy.symbol);
    
    // Prepare order data for Upstox API
    const orderData = {
      trading_symbol: tradingSymbol,
      instrument_token: instrumentToken,
      quantity: strategy.parameters.quantity,
      price: signal.price,
      order_type: 'LIMIT', // Use LIMIT order for better control
      transaction_type: signal.action, // BUY or SELL
      product: 'MIS', // Intraday for algo trading
      validity: 'DAY',
      disclosed_quantity: 0,
      trigger_price: 0,
      is_amo: false,
      slice: true,
      tag: `algo_${strategy.type}_${Date.now()}`
    };
    
    console.log(`📤 Placing order with data:`, orderData);
    
    // Create a mock request object with user token for authentication
    const mockReq = {
      user: {
        access_token: getSystemAccessToken(), // You'll need to implement this
        user_id: 'algo_system',
        role: 'parent'
      }
    };
    
    // Place the actual trade using the existing trading service
    const response = await placeOrderDirect(orderData, mockReq.user.access_token);
    
    if (response.success) {
      console.log(`✅ Trade executed successfully! Order ID: ${response.order.order_id}`);
      
      // Schedule stop loss and take profit orders
      setTimeout(() => {
        scheduleStopLossAndTakeProfit(strategy, signal, response.order.order_id);
      }, 5000); // Wait 5 seconds before placing SL/TP orders
      
      return {
        success: true,
        orderId: response.order.order_id,
        message: 'Trade executed successfully'
      };
    } else {
      return {
        success: false,
        error: response.error || 'Unknown error'
      };
    }
    
  } catch (error) {
    console.error(`❌ Real trade execution failed:`, error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Helper function to convert Yahoo Finance symbols to Upstox instrument tokens
const getInstrumentToken = (yahooSymbol) => {
  const symbolMap = {
    '^NSEI': 'NSE_INDEX|Nifty 50',
    '^NSEBANK': 'NSE_INDEX|Nifty Bank',
    'RELIANCE.NS': 'NSE_EQ|INE002A01018',
    'TCS.NS': 'NSE_EQ|INE467B01029',
    'INFY.NS': 'NSE_EQ|INE009A01021',
    'HDFCBANK.NS': 'NSE_EQ|INE040A01034',
    'ICICIBANK.NS': 'NSE_EQ|INE090A01013'
  };
  
  return symbolMap[yahooSymbol] || `NSE_EQ|${yahooSymbol.replace('.NS', '')}`;
};

// Helper function to get trading symbol
const getTradingSymbol = (yahooSymbol) => {
  const symbolMap = {
    '^NSEI': 'NIFTY',
    '^NSEBANK': 'BANKNIFTY',
    'RELIANCE.NS': 'RELIANCE',
    'TCS.NS': 'TCS',
    'INFY.NS': 'INFY',
    'HDFCBANK.NS': 'HDFCBANK',
    'ICICIBANK.NS': 'ICICIBANK'
  };
  
  return symbolMap[yahooSymbol] || yahooSymbol.replace('.NS', '');
};

// Function to get system access token (implement based on your auth system)
const getSystemAccessToken = () => {
  // In production, you should have a system account or use a valid user token
  // For now, return a placeholder - you'll need to implement proper token management
  return process.env.SYSTEM_ACCESS_TOKEN || 'your_system_access_token_here';
};

// Direct order placement function (bypasses middleware)
const placeOrderDirect = async (orderData, accessToken) => {
  try {
    const axios = (await import('axios')).default;
    
    // Use the correct Upstox API endpoint
    const apiUrl = process.env.UPSTOX_ENV === 'live' 
      ? 'https://api-hft.upstox.com/v3'
      : 'https://api-sandbox.upstox.com/v3';
    
    const response = await axios.post(`${apiUrl}/order/place`, orderData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    const orderIds = response.data.data?.order_ids || [response.data.data?.order_id];
    const primaryOrderId = orderIds[0];
    
    return {
      success: true,
      order: {
        order_id: primaryOrderId,
        ...orderData
      },
      upstox_response: response.data
    };
    
  } catch (error) {
    console.error('Direct order placement failed:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

// Schedule stop loss and take profit orders
const scheduleStopLossAndTakeProfit = async (strategy, signal, parentOrderId) => {
  try {
    const { stopLoss, takeProfit } = strategy.parameters;
    const currentPrice = signal.price;
    
    let stopLossPrice, takeProfitPrice;
    
    if (signal.action === 'BUY') {
      stopLossPrice = currentPrice * (1 - stopLoss / 100);
      takeProfitPrice = currentPrice * (1 + takeProfit / 100);
    } else {
      stopLossPrice = currentPrice * (1 + stopLoss / 100);
      takeProfitPrice = currentPrice * (1 - takeProfit / 100);
    }
    
    // Place stop loss order
    const stopLossOrder = {
      trading_symbol: getTradingSymbol(strategy.symbol),
      instrument_token: getInstrumentToken(strategy.symbol),
      quantity: strategy.parameters.quantity,
      price: stopLossPrice,
      order_type: 'SL',
      transaction_type: signal.action === 'BUY' ? 'SELL' : 'BUY',
      product: 'MIS',
      validity: 'DAY',
      trigger_price: stopLossPrice,
      tag: `sl_${parentOrderId}`
    };
    
    // Place take profit order
    const takeProfitOrder = {
      trading_symbol: getTradingSymbol(strategy.symbol),
      instrument_token: getInstrumentToken(strategy.symbol),
      quantity: strategy.parameters.quantity,
      price: takeProfitPrice,
      order_type: 'LIMIT',
      transaction_type: signal.action === 'BUY' ? 'SELL' : 'BUY',
      product: 'MIS',
      validity: 'DAY',
      tag: `tp_${parentOrderId}`
    };
    
    const accessToken = getSystemAccessToken();
    
    // Place both orders
    const slResult = await placeOrderDirect(stopLossOrder, accessToken);
    const tpResult = await placeOrderDirect(takeProfitOrder, accessToken);
    
    console.log(`📋 Stop Loss Order: ${slResult.success ? 'Success' : 'Failed'}`);
    console.log(`📋 Take Profit Order: ${tpResult.success ? 'Success' : 'Failed'}`);
    
    const logMessage = `[${new Date().toLocaleTimeString()}] 🛡️ Risk management orders placed for ${strategy.name} - SL: ₹${stopLossPrice.toFixed(2)}, TP: ₹${takeProfitPrice.toFixed(2)}`;
    systemStatus.logs.push(logMessage);
    
  } catch (error) {
    console.error('Failed to place stop loss/take profit orders:', error);
    const errorMessage = `[${new Date().toLocaleTimeString()}] ❌ Failed to place risk management orders for ${strategy.name}`;
    systemStatus.logs.push(errorMessage);
  }
};

// Initialize default strategies
const initializeStrategies = () => {
  const defaultStrategies = [
    {
      id: 'ema_crossover_1',
      name: 'EMA Crossover NIFTY',
      type: 'ema_crossover',
      symbol: 'NIFTY.NS', // Use .NS suffix for Yahoo Finance
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
        totalTrades: 0,
        winRate: 0,
        totalPnL: 0,
        maxDrawdown: 0,
        sharpeRatio: 0
      }
    },
    {
      id: 'rsi_oversold_1',
      name: 'RSI Oversold BANKNIFTY',
      type: 'rsi_oversold',
      symbol: 'BANKNIFTY.NS', // Use .NS suffix for Yahoo Finance
      enabled: false,
      parameters: {
        rsiPeriod: 14,
        oversoldLevel: 30,
        overboughtLevel: 70,
        quantity: 15,
        stopLoss: 1.5,
        takeProfit: 3.0
      },
      performance: {
        totalTrades: 0,
        winRate: 0,
        totalPnL: 0,
        maxDrawdown: 0,
        sharpeRatio: 0
      }
    },
    {
      id: 'sma_trend_1',
      name: 'SMA Trend RELIANCE',
      type: 'sma_trend',
      symbol: 'RELIANCE.NS',
      enabled: false,
      parameters: {
        shortPeriod: 20,
        longPeriod: 50,
        trendStrength: 1.2,
        quantity: 10,
        stopLoss: 2.5,
        takeProfit: 5.0
      },
      performance: {
        totalTrades: 0,
        winRate: 0,
        totalPnL: 0,
        maxDrawdown: 0,
        sharpeRatio: 0
      }
    },
    {
      id: 'bollinger_bands_1',
      name: 'Bollinger Bands TCS',
      type: 'bollinger_bands',
      symbol: 'TCS.NS',
      enabled: false,
      parameters: {
        period: 20,
        stdDev: 2.0,
        quantity: 5,
        stopLoss: 1.8,
        takeProfit: 3.5,
        meanReversion: true
      },
      performance: {
        totalTrades: 0,
        winRate: 0,
        totalPnL: 0,
        maxDrawdown: 0,
        sharpeRatio: 0
      }
    }
  ];
  
  defaultStrategies.forEach(strategy => {
    strategies.set(strategy.id, strategy);
  });
};

// Initialize strategies on startup
initializeStrategies();

// Cron job for auto trading (runs every minute)
cron.schedule('* * * * *', () => {
  if (systemStatus.autoTradingEnabled) {
    console.log(`🤖 [${new Date().toLocaleTimeString()}] Running auto trading cycle...`);
    executeAutoTrading();
  }
});

// Additional cron job for more frequent checks (every 30 seconds) during market hours
cron.schedule('*/30 * * * * *', () => {
  if (systemStatus.autoTradingEnabled) {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    // Only run during market hours (9:15 AM to 3:30 PM IST)
    if ((hour === 9 && minute >= 15) || (hour >= 10 && hour < 15) || (hour === 15 && minute <= 30)) {
      console.log(`⚡ [${new Date().toLocaleTimeString()}] High-frequency trading check...`);
      executeAutoTrading();
    }
  }
});

// Routes
router.get('/', authenticateToken, (req, res) => {
  const strategiesArray = Array.from(strategies.values());
  res.json({ success: true, strategies: strategiesArray });
});

router.put('/:strategyId', authenticateToken, (req, res) => {
  const { strategyId } = req.params;
  const updates = req.body;
  
  if (strategies.has(strategyId)) {
    const strategy = strategies.get(strategyId);
    Object.assign(strategy, updates);
    strategies.set(strategyId, strategy);
    
    const logMessage = `[${new Date().toLocaleTimeString()}] Strategy ${strategy.name} updated`;
    systemStatus.logs.push(logMessage);
    
    res.json({ success: true, strategy });
  } else {
    res.status(404).json({ success: false, error: 'Strategy not found' });
  }
});

router.get('/system/status', authenticateToken, (req, res) => {
  res.json({
    success: true,
    ...systemStatus,
    activeStrategies: Array.from(strategies.values()).filter(s => s.enabled).length,
    totalStrategies: strategies.size
  });
});

router.post('/system/auto-trading', authenticateToken, (req, res) => {
  const { enabled } = req.body;
  
  systemStatus.autoTradingEnabled = enabled;
  systemStatus.status = enabled ? 'running' : 'stopped';
  
  const logMessage = `[${new Date().toLocaleTimeString()}] Auto trading ${enabled ? 'started' : 'stopped'}`;
  systemStatus.logs.push(logMessage);
  
  console.log(`🤖 ${logMessage}`);
  
  res.json({ success: true, autoTradingEnabled: enabled });
});

router.post('/market-data', authenticateToken, async (req, res) => {
  const { symbols } = req.body;
  const marketData = {};
  
  for (const symbol of symbols) {
    const cached = marketDataCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < 60000) {
      marketData[symbol] = cached;
    } else {
      const fresh = await fetchMarketData(symbol);
      if (fresh) {
        marketDataCache.set(symbol, fresh);
        marketData[symbol] = fresh;
      }
    }
  }
  
  res.json(marketData);
});

router.get('/chart-data/:symbol/:strategyType', authenticateToken, async (req, res) => {
  const { symbol, strategyType } = req.params;
  
  try {
    // In production, fetch real historical data
    // For now, generate mock data
    const now = Math.floor(Date.now() / 1000);
    const candles = [];
    const indicators = {};
    const signals = [];
    
    let basePrice = 19450; // Mock base price
    
    // Generate 100 candles
    for (let i = 99; i >= 0; i--) {
      const time = now - (i * 60);
      const volatility = basePrice * 0.002;
      const change = (Math.random() - 0.5) * volatility;
      
      const open = basePrice;
      const close = basePrice + change;
      const high = Math.max(open, close) + Math.random() * volatility * 0.5;
      const low = Math.min(open, close) - Math.random() * volatility * 0.5;
      
      candles.push({ time, open, high, low, close });
      basePrice = close;
    }
    
    // Generate indicators based on strategy type
    const prices = candles.map(c => c.close);
    
    switch (strategyType) {
      case 'ema_crossover':
        const ema9 = calculateEMA(prices, 9);
        const ema21 = calculateEMA(prices, 21);
        indicators.ema9 = ema9.map((value, index) => ({ time: candles[index].time, value }));
        indicators.ema21 = ema21.map((value, index) => ({ time: candles[index].time, value }));
        break;
        
      case 'sma_trend':
        const sma20 = calculateSMA(prices, 20);
        const sma50 = calculateSMA(prices, 50);
        indicators.sma20 = sma20.map((value, index) => ({ 
          time: candles[index + 19].time, 
          value 
        }));
        indicators.sma50 = sma50.map((value, index) => ({ 
          time: candles[index + 49].time, 
          value 
        }));
        break;
        
      case 'bollinger_bands':
        const bands = calculateBollingerBands(prices, 20, 2);
        indicators.bbUpper = bands.map((band, index) => ({ 
          time: candles[index + 19].time, 
          value: band.upper 
        }));
        indicators.bbMiddle = bands.map((band, index) => ({ 
          time: candles[index + 19].time, 
          value: band.middle 
        }));
        indicators.bbLower = bands.map((band, index) => ({ 
          time: candles[index + 19].time, 
          value: band.lower 
        }));
        break;
    }
    
    res.json({ candles, indicators, signals });
    
  } catch (error) {
    console.error('Chart data error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch chart data' });
  }
});

export default router;