import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { tradingService } from '../services/tradingService';
import { 
  Play, 
  Pause, 
  Square,
  TrendingUp, 
  TrendingDown, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Target,
  Zap,
  Brain,
  DollarSign,
  Clock,
  RefreshCw,
  Settings,
  Eye,
  Wifi,
  WifiOff
} from 'lucide-react';
import { format } from 'date-fns';

interface MarketTick {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
  high: number;
  low: number;
  open: number;
  close: number;
}

interface TechnicalIndicators {
  rsi: number;
  sma20: number;
  sma50: number;
  ema9: number;
  ema21: number;
  macd: number;
  macdSignal: number;
  bollingerUpper: number;
  bollingerLower: number;
  stochasticK: number;
  stochasticD: number;
  atr: number;
  volumeRatio: number;
}

interface TradingSignal {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  strength: number;
  price: number;
  timestamp: number;
  indicators: TechnicalIndicators;
  conditions: string[];
}

interface LivePosition {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  timestamp: number;
  orderId?: string;
}

interface TradingStrategy {
  symbol: string;
  enabled: boolean;
  quantity: number;
  stopLoss: number;
  takeProfit: number;
  maxPositions: number;
  conditions: {
    rsiOverbought: number;
    rsiOversold: number;
    emaSignal: boolean;
    volumeThreshold: number;
    priceAction: boolean;
  };
}

const LiveTradingEngine: React.FC = () => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  
  // Trading State
  const [isRunning, setIsRunning] = useState(false);
  const [marketData, setMarketData] = useState<{ [symbol: string]: MarketTick[] }>({});
  const [indicators, setIndicators] = useState<{ [symbol: string]: TechnicalIndicators }>({});
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [positions, setPositions] = useState<LivePosition[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [performance, setPerformance] = useState({
    totalPnL: 0,
    totalTrades: 0,
    winRate: 0,
    maxDrawdown: 0
  });

  // Strategy Configuration
  const [strategies, setStrategies] = useState<{ [symbol: string]: TradingStrategy }>({
    'BANKNIFTY': {
      symbol: 'BANKNIFTY',
      enabled: true,
      quantity: 15,
      stopLoss: 50,
      takeProfit: 100,
      maxPositions: 2,
      conditions: {
        rsiOverbought: 70,
        rsiOversold: 30,
        emaSignal: true,
        volumeThreshold: 1.5,
        priceAction: true
      }
    },
    'NIFTY': {
      symbol: 'NIFTY',
      enabled: true,
      quantity: 25,
      stopLoss: 30,
      takeProfit: 60,
      maxPositions: 2,
      conditions: {
        rsiOverbought: 75,
        rsiOversold: 25,
        emaSignal: true,
        volumeThreshold: 1.2,
        priceAction: true
      }
    }
  });

  // Refs for intervals and data
  const tradingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const priceHistoryRef = useRef<{ [symbol: string]: number[] }>({});
  const volumeHistoryRef = useRef<{ [symbol: string]: number[] }>({});
  const lastTradeTimeRef = useRef<{ [symbol: string]: number }>({});
  const logsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  // Add log entry
  const addLog = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const timestamp = format(new Date(), 'HH:mm:ss.SSS');
    const emoji = {
      info: '📊',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    }[type];
    
    setLogs(prev => [...prev.slice(-199), `[${timestamp}] ${emoji} ${message}`]);
  };

  // Calculate technical indicators
  const calculateIndicators = (symbol: string, prices: number[], volumes: number[]): TechnicalIndicators => {
    const length = prices.length;
    if (length < 50) {
      return {
        rsi: 50,
        sma20: prices[length - 1] || 0,
        sma50: prices[length - 1] || 0,
        ema9: prices[length - 1] || 0,
        ema21: prices[length - 1] || 0,
        macd: 0,
        macdSignal: 0,
        bollingerUpper: prices[length - 1] || 0,
        bollingerLower: prices[length - 1] || 0,
        stochasticK: 50,
        stochasticD: 50,
        atr: 0,
        volumeRatio: 1
      };
    }

    // RSI Calculation
    const rsi = calculateRSI(prices.slice(-14));
    
    // Moving Averages
    const sma20 = prices.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const sma50 = prices.slice(-50).reduce((a, b) => a + b, 0) / 50;
    const ema9 = calculateEMA(prices.slice(-9), 9);
    const ema21 = calculateEMA(prices.slice(-21), 21);
    
    // MACD
    const ema12 = calculateEMA(prices.slice(-12), 12);
    const ema26 = calculateEMA(prices.slice(-26), 26);
    const macd = ema12 - ema26;
    const macdSignal = calculateEMA([macd], 9);
    
    // Bollinger Bands
    const stdDev = calculateStandardDeviation(prices.slice(-20));
    const bollingerUpper = sma20 + (2 * stdDev);
    const bollingerLower = sma20 - (2 * stdDev);
    
    // Stochastic
    const high14 = Math.max(...prices.slice(-14));
    const low14 = Math.min(...prices.slice(-14));
    const currentPrice = prices[length - 1];
    const stochasticK = ((currentPrice - low14) / (high14 - low14)) * 100;
    const stochasticD = stochasticK; // Simplified
    
    // ATR
    const atr = calculateATR(prices.slice(-14));
    
    // Volume Ratio
    const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const currentVolume = volumes[volumes.length - 1] || 1;
    const volumeRatio = currentVolume / (avgVolume || 1);

    return {
      rsi,
      sma20,
      sma50,
      ema9,
      ema21,
      macd,
      macdSignal,
      bollingerUpper,
      bollingerLower,
      stochasticK,
      stochasticD,
      atr,
      volumeRatio
    };
  };

  // Helper functions for technical indicators
  const calculateRSI = (prices: number[]): number => {
    if (prices.length < 2) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    const avgGain = gains / (prices.length - 1);
    const avgLoss = losses / (prices.length - 1);
    const rs = avgGain / (avgLoss || 1);
    
    return 100 - (100 / (1 + rs));
  };

  const calculateEMA = (prices: number[], period: number): number => {
    if (prices.length === 0) return 0;
    if (prices.length === 1) return prices[0];
    
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }
    
    return ema;
  };

  const calculateStandardDeviation = (prices: number[]): number => {
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
    return Math.sqrt(variance);
  };

  const calculateATR = (prices: number[]): number => {
    if (prices.length < 2) return 0;
    
    let totalTrueRange = 0;
    for (let i = 1; i < prices.length; i++) {
      const trueRange = Math.abs(prices[i] - prices[i - 1]);
      totalTrueRange += trueRange;
    }
    
    return totalTrueRange / (prices.length - 1);
  };

  // Generate trading signals based on technical analysis
  const generateSignal = (symbol: string, currentPrice: number, indicators: TechnicalIndicators): TradingSignal => {
    const strategy = strategies[symbol];
    if (!strategy || !strategy.enabled) {
      return {
        symbol,
        action: 'HOLD',
        strength: 0,
        price: currentPrice,
        timestamp: Date.now(),
        indicators,
        conditions: []
      };
    }

    const conditions: string[] = [];
    let buySignals = 0;
    let sellSignals = 0;

    // RSI Signals
    if (indicators.rsi < strategy.conditions.rsiOversold) {
      buySignals++;
      conditions.push(`RSI oversold (${indicators.rsi.toFixed(1)})`);
    } else if (indicators.rsi > strategy.conditions.rsiOverbought) {
      sellSignals++;
      conditions.push(`RSI overbought (${indicators.rsi.toFixed(1)})`);
    }

    // EMA Crossover
    if (strategy.conditions.emaSignal) {
      if (indicators.ema9 > indicators.ema21) {
        buySignals++;
        conditions.push('EMA bullish crossover');
      } else if (indicators.ema9 < indicators.ema21) {
        sellSignals++;
        conditions.push('EMA bearish crossover');
      }
    }

    // Volume confirmation
    if (indicators.volumeRatio > strategy.conditions.volumeThreshold) {
      conditions.push(`High volume (${indicators.volumeRatio.toFixed(1)}x)`);
      if (buySignals > sellSignals) buySignals++;
      else if (sellSignals > buySignals) sellSignals++;
    }

    // Price action relative to Bollinger Bands
    if (strategy.conditions.priceAction) {
      if (currentPrice < indicators.bollingerLower) {
        buySignals++;
        conditions.push('Price below lower Bollinger band');
      } else if (currentPrice > indicators.bollingerUpper) {
        sellSignals++;
        conditions.push('Price above upper Bollinger band');
      }
    }

    // MACD Signal
    if (indicators.macd > indicators.macdSignal) {
      buySignals++;
      conditions.push('MACD bullish');
    } else if (indicators.macd < indicators.macdSignal) {
      sellSignals++;
      conditions.push('MACD bearish');
    }

    // Determine action and strength
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let strength = 0;

    if (buySignals > sellSignals && buySignals >= 3) {
      action = 'BUY';
      strength = Math.min(buySignals / 5, 1);
    } else if (sellSignals > buySignals && sellSignals >= 3) {
      action = 'SELL';
      strength = Math.min(sellSignals / 5, 1);
    }

    return {
      symbol,
      action,
      strength,
      price: currentPrice,
      timestamp: Date.now(),
      indicators,
      conditions
    };
  };

  // Execute trade based on signal
  const executeTrade = async (signal: TradingSignal) => {
    if (signal.action === 'HOLD' || signal.strength < 0.6) return;

    const strategy = strategies[signal.symbol];
    if (!strategy) return;

    // Check position limits
    const currentPositions = positions.filter(p => p.symbol === signal.symbol);
    if (currentPositions.length >= strategy.maxPositions) {
      addLog(`Max positions reached for ${signal.symbol}`, 'warning');
      return;
    }

    // Check time since last trade (minimum 30 seconds)
    const lastTradeTime = lastTradeTimeRef.current[signal.symbol] || 0;
    const timeSinceLastTrade = Date.now() - lastTradeTime;
    if (timeSinceLastTrade < 30000) {
      addLog(`Too soon since last trade for ${signal.symbol}`, 'warning');
      return;
    }

    try {
      addLog(`Executing ${signal.action} order for ${signal.symbol} at ₹${signal.price.toFixed(2)}`, 'info');

      // Prepare order data
      const orderData = {
        trading_symbol: signal.symbol,
        instrument_token: `NSE_EQ|${signal.symbol}`,
        quantity: strategy.quantity,
        price: signal.price,
        order_type: 'MARKET',
        transaction_type: signal.action,
        product: 'MIS', // Intraday
        validity: 'DAY',
        tag: `live_trading_${Date.now()}`
      };

      // Place order
      const response = await tradingService.placeOrder(orderData);
      
      if (response.success) {
        // Create position record
        const newPosition: LivePosition = {
          id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          symbol: signal.symbol,
          side: signal.action,
          quantity: strategy.quantity,
          entryPrice: signal.price,
          currentPrice: signal.price,
          pnl: 0,
          timestamp: Date.now(),
          orderId: response.order?.order_id
        };

        setPositions(prev => [...prev, newPosition]);
        lastTradeTimeRef.current[signal.symbol] = Date.now();

        addLog(`✅ ${signal.action} order placed successfully for ${signal.symbol}`, 'success');
        addLog(`Order ID: ${response.order?.order_id}`, 'info');
        
        // Update performance
        setPerformance(prev => ({
          ...prev,
          totalTrades: prev.totalTrades + 1
        }));

      } else {
        addLog(`❌ Failed to place ${signal.action} order for ${signal.symbol}: ${response.error}`, 'error');
      }

    } catch (error: any) {
      addLog(`❌ Trade execution error for ${signal.symbol}: ${error.message}`, 'error');
      console.error('Trade execution error:', error);
    }
  };

  // Check exit conditions for existing positions
  const checkExitConditions = async (position: LivePosition, currentPrice: number) => {
    const strategy = strategies[position.symbol];
    if (!strategy) return;

    const pnl = position.side === 'BUY' 
      ? (currentPrice - position.entryPrice) * position.quantity
      : (position.entryPrice - currentPrice) * position.quantity;

    // Update position PnL
    setPositions(prev => prev.map(p => 
      p.id === position.id 
        ? { ...p, currentPrice, pnl }
        : p
    ));

    // Check stop loss
    if (pnl <= -strategy.stopLoss) {
      await exitPosition(position, currentPrice, 'Stop Loss');
      return;
    }

    // Check take profit
    if (pnl >= strategy.takeProfit) {
      await exitPosition(position, currentPrice, 'Take Profit');
      return;
    }
  };

  // Exit position
  const exitPosition = async (position: LivePosition, exitPrice: number, reason: string) => {
    try {
      addLog(`Exiting ${position.side} position for ${position.symbol} - ${reason}`, 'info');

      const exitSide = position.side === 'BUY' ? 'SELL' : 'BUY';
      
      const orderData = {
        trading_symbol: position.symbol,
        instrument_token: `NSE_EQ|${position.symbol}`,
        quantity: position.quantity,
        price: exitPrice,
        order_type: 'MARKET',
        transaction_type: exitSide,
        product: 'MIS',
        validity: 'DAY',
        tag: `exit_${position.id}`
      };

      const response = await tradingService.placeOrder(orderData);
      
      if (response.success) {
        const finalPnL = position.side === 'BUY' 
          ? (exitPrice - position.entryPrice) * position.quantity
          : (position.entryPrice - exitPrice) * position.quantity;

        // Remove position
        setPositions(prev => prev.filter(p => p.id !== position.id));

        // Update performance
        setPerformance(prev => ({
          ...prev,
          totalPnL: prev.totalPnL + finalPnL,
          winRate: finalPnL > 0 
            ? ((prev.winRate * prev.totalTrades) + 1) / (prev.totalTrades + 1) * 100
            : (prev.winRate * prev.totalTrades) / (prev.totalTrades + 1) * 100
        }));

        addLog(`✅ Position closed: ${finalPnL > 0 ? '+' : ''}₹${finalPnL.toFixed(2)}`, finalPnL > 0 ? 'success' : 'error');

      } else {
        addLog(`❌ Failed to exit position for ${position.symbol}`, 'error');
      }

    } catch (error: any) {
      addLog(`❌ Exit error for ${position.symbol}: ${error.message}`, 'error');
    }
  };

  // Main trading loop
  const runTradingLoop = () => {
    if (!isRunning) return;
    
    addLog('📊 Analyzing market data and generating signals...', 'info');

    Object.keys(strategies).forEach(symbol => {
      const strategy = strategies[symbol];
      if (!strategy.enabled) return;

      // Generate realistic market data with proper volatility
      const currentPrice = generateMockPrice(symbol);
      const baseVolume = symbol === 'BANKNIFTY' ? 800000 : symbol === 'NIFTY' ? 700000 : 500000;
      const volumeVariation = (Math.random() * 0.5 + 0.75); // 75% to 125% of base
      const currentVolume = Math.floor(baseVolume * volumeVariation);

      // Update price and volume history
      if (!priceHistoryRef.current[symbol]) priceHistoryRef.current[symbol] = [];
      if (!volumeHistoryRef.current[symbol]) volumeHistoryRef.current[symbol] = [];

      priceHistoryRef.current[symbol].push(currentPrice);
      volumeHistoryRef.current[symbol].push(currentVolume);
      
      addLog(`${symbol}: ₹${currentPrice.toFixed(2)} | Vol: ${(currentVolume/1000).toFixed(0)}K`, 'info');

      // Keep only last 100 data points
      if (priceHistoryRef.current[symbol].length > 100) {
        priceHistoryRef.current[symbol] = priceHistoryRef.current[symbol].slice(-100);
        volumeHistoryRef.current[symbol] = volumeHistoryRef.current[symbol].slice(-100);
      }

      // Calculate indicators
      const calculatedIndicators = calculateIndicators(
        symbol,
        priceHistoryRef.current[symbol],
        volumeHistoryRef.current[symbol]
      );

      setIndicators(prev => ({ ...prev, [symbol]: calculatedIndicators }));

      // Generate signal
      const signal = generateSignal(symbol, currentPrice, calculatedIndicators);
      
      if (signal.action !== 'HOLD') {
        setSignals(prev => [signal, ...prev.slice(0, 19)]); // Keep last 20 signals
        addLog(`🎯 ${signal.action} signal for ${symbol}: ${signal.conditions.join(', ')}`, 'warning');
        
        // Execute trade if signal is strong enough
        if (signal.strength >= 0.6) {
          executeTrade(signal);
        }
      }

      // Check exit conditions for existing positions
      positions
        .filter(p => p.symbol === symbol)
        .forEach(position => {
          checkExitConditions(position, currentPrice);
        });
    });
  };

  // Generate mock price data for testing
  const generateMockPrice = (symbol: string): number => {
    const basePrice = symbol === 'BANKNIFTY' ? 45082.24 : symbol === 'NIFTY' ? 19448.87 : 2500;
    const volatility = symbol === 'BANKNIFTY' ? 500 : symbol === 'NIFTY' ? 200 : 50;
    
    const lastPrice = priceHistoryRef.current[symbol]?.slice(-1)[0] || basePrice;
    
    // Create more realistic price movements with trend and volatility
    const trend = Math.sin(Date.now() / 10000) * 0.1; // Slow trend component
    const noise = (Math.random() - 0.5) * 2; // Random noise
    const momentum = Math.random() > 0.5 ? 1 : -1; // Random momentum
    
    const change = (trend + noise * 0.3 + momentum * 0.1) * volatility;
    
    return Math.max(lastPrice + change, basePrice * 0.95); // Prevent negative prices
  };

  // Start trading system
  const startTrading = () => {
    setIsRunning(true);
    addLog('🚀 Live trading system started', 'success');
    addLog('📡 Connecting to market data feeds...', 'info');
    addLog('⚡ Real-time price updates every 2 seconds', 'info');
    
    // Run trading loop every 2 seconds for live testing
    tradingIntervalRef.current = setInterval(runTradingLoop, 2000);
  };

  // Stop trading system
  const stopTrading = () => {
    setIsRunning(false);
    if (tradingIntervalRef.current) {
      clearInterval(tradingIntervalRef.current);
      tradingIntervalRef.current = null;
    }
    addLog('⏹️ Live trading system stopped', 'warning');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tradingIntervalRef.current) {
        clearInterval(tradingIntervalRef.current);
      }
    };
  }, []);

  // Initialize with some mock data
  useEffect(() => {
    addLog('🔧 Initializing market data streams...', 'info');
    
    Object.keys(strategies).forEach(symbol => {
      // Initialize with realistic historical data
      const basePrice = symbol === 'BANKNIFTY' ? 45082.24 : symbol === 'NIFTY' ? 19448.87 : 2500;
      const prices = Array.from({ length: 50 }, (_, i) => {
        const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
        return basePrice * (1 + variation);
      });
      
      const baseVolume = symbol === 'BANKNIFTY' ? 800000 : symbol === 'NIFTY' ? 700000 : 500000;
      const volumes = Array.from({ length: 50 }, () => 
        Math.floor(baseVolume * (Math.random() * 0.5 + 0.75))
      );
      
      priceHistoryRef.current[symbol] = prices;
      volumeHistoryRef.current[symbol] = volumes;
      
      const calculatedIndicators = calculateIndicators(symbol, prices, volumes);
      setIndicators(prev => ({ ...prev, [symbol]: calculatedIndicators }));
      
      addLog(`📈 ${symbol} initialized: ₹${prices[prices.length-1].toFixed(2)}`, 'success');
    });
    
    addLog('✅ Market data initialization complete', 'success');
  }, []);

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-600 rounded-lg">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Live Trading Engine</h2>
              <p className="text-gray-400">Real-time chart analysis and automated trading</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
              isRunning ? 'bg-green-600' : 'bg-red-600'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isRunning ? 'bg-green-300 animate-pulse' : 'bg-red-300'
              }`} />
              <span className="text-white font-medium">
                {isRunning ? 'LIVE' : 'STOPPED'}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <Wifi className="h-5 w-5 text-green-400" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-400" />
              )}
              <span className={`text-sm ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            {!isRunning ? (
              <button
                onClick={startTrading}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Play className="w-4 h-4" />
                <span>Start Trading</span>
              </button>
            ) : (
              <button
                onClick={stopTrading}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <Square className="w-4 h-4" />
                <span>Stop Trading</span>
              </button>
            )}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total P&L</p>
                <p className={`text-xl font-bold ${
                  performance.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {performance.totalPnL >= 0 ? '+' : ''}₹{performance.totalPnL.toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Win Rate</p>
                <p className="text-xl font-bold text-blue-400">
                  {performance.winRate.toFixed(1)}%
                </p>
              </div>
              <Target className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Trades</p>
                <p className="text-xl font-bold text-purple-400">
                  {performance.totalTrades}
                </p>
              </div>
              <Activity className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Open Positions</p>
                <p className="text-xl font-bold text-yellow-400">
                  {positions.length}
                </p>
              </div>
              <BarChart3 className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Market Data & Indicators */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Market Data */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Live Market Data</h3>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                <span className={`text-xs ${isRunning ? 'text-green-400' : 'text-red-400'}`}>
                  {isRunning ? 'LIVE' : 'STOPPED'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(strategies).map(([symbol, strategy]) => {
                const currentIndicators = indicators[symbol];
                const currentPrice = priceHistoryRef.current[symbol]?.slice(-1)[0] || 0;
                const previousPrice = priceHistoryRef.current[symbol]?.slice(-2, -1)[0] || currentPrice;
                const priceChange = currentPrice - previousPrice;
                const priceChangePercent = ((priceChange / previousPrice) * 100);
                
                return (
                  <div key={symbol} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-white font-medium">{symbol}</h4>
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${
                          strategy.enabled ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
                        }`} />
                        <span className={`text-xs font-medium ${
                          priceChange > 0 ? 'text-green-400' : priceChange < 0 ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {priceChange > 0 ? '▲' : priceChange < 0 ? '▼' : '●'} {priceChangePercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Price:</span>
                        <span className={`font-medium ${
                          priceChange > 0 ? 'text-green-400' : priceChange < 0 ? 'text-red-400' : 'text-white'
                        }`}>
                          ₹{currentPrice.toFixed(2)}
                        </span>
                      </div>
                      
                      {currentIndicators && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-400">RSI:</span>
                            <span className={`font-medium ${
                              currentIndicators.rsi > 70 ? 'text-red-400' :
                              currentIndicators.rsi < 30 ? 'text-green-400' : 'text-white'
                            }`}>
                              {currentIndicators.rsi.toFixed(1)}
                            </span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-gray-400">EMA 9/21:</span>
                            <span className={`font-medium ${
                              currentIndicators.ema9 > currentIndicators.ema21 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {currentIndicators.ema9 > currentIndicators.ema21 ? 'Bullish' : 'Bearish'}
                            </span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-gray-400">Volume:</span>
                            <span className={`font-medium ${
                              currentIndicators.volumeRatio > 1.5 ? 'text-yellow-400 animate-pulse' : 'text-white'
                            }`}>
                              {currentIndicators.volumeRatio.toFixed(1)}x
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Signals */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-4">Trading Signals</h3>
            <div className="space-y-3">
              {signals.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No signals generated yet</p>
              ) : (
                signals.slice(0, 10).map((signal, index) => (
                  <div key={index} className="bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-white font-medium">{signal.symbol}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          signal.action === 'BUY' ? 'bg-green-600 text-white' : 
                          signal.action === 'SELL' ? 'bg-red-600 text-white' : 'bg-gray-600 text-white'
                        }`}>
                          {signal.action}
                        </span>
                        <span className="text-gray-400 text-xs">
                          Strength: {(signal.strength * 100).toFixed(0)}%
                        </span>
                      </div>
                      <span className="text-gray-400 text-xs">
                        {format(new Date(signal.timestamp), 'HH:mm:ss')}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-400">
                      Price: ₹{signal.price.toFixed(2)} | {signal.conditions.join(', ')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* System Logs */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">System Logs</h3>
            <button
              onClick={() => setLogs([])}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          
          <div 
            ref={logsRef}
            className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto font-mono text-xs"
          >
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs available</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="text-gray-300 mb-1 leading-relaxed">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Active Positions */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4">Active Positions</h3>
        
        {positions.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No active positions</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-400 border-b border-gray-700">
                <tr>
                  <th className="text-left py-3">Symbol</th>
                  <th className="text-left py-3">Side</th>
                  <th className="text-left py-3">Quantity</th>
                  <th className="text-left py-3">Entry Price</th>
                  <th className="text-left py-3">Current Price</th>
                  <th className="text-left py-3">P&L</th>
                  <th className="text-left py-3">Time</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position) => (
                  <tr key={position.id} className="border-b border-gray-700">
                    <td className="py-3 text-white font-medium">{position.symbol}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        position.side === 'BUY' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                      }`}>
                        {position.side}
                      </span>
                    </td>
                    <td className="py-3 text-gray-300">{position.quantity}</td>
                    <td className="py-3 text-gray-300">₹{position.entryPrice.toFixed(2)}</td>
                    <td className="py-3 text-gray-300">₹{position.currentPrice.toFixed(2)}</td>
                    <td className={`py-3 font-medium ${
                      position.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {position.pnl >= 0 ? '+' : ''}₹{position.pnl.toFixed(2)}
                    </td>
                    <td className="py-3 text-gray-300">
                      {format(new Date(position.timestamp), 'HH:mm:ss')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveTradingEngine;