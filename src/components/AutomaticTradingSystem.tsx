import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { tradingService } from '../services/tradingService';
import LiveTradingEngine from './LiveTradingEngine';
import StrategyBuilder from './StrategyBuilder';
import { 
  Play, 
  Pause, 
  Settings, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Target,
  Shield,
  Zap,
  Brain,
  DollarSign,
  Clock,
  RefreshCw,
  Plus,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  Layers
} from 'lucide-react';
import { format } from 'date-fns';

interface TechnicalIndicators {
  sma: number[];
  ema: number[];
  rsi: number;
  macd: { macd: number; signal: number; histogram: number };
  bollinger: { upper: number; middle: number; lower: number };
  stochastic: { k: number; d: number };
  atr: number;
  volume: number;
}

interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
  high: number;
  low: number;
  open: number;
  close: number;
}

interface TradingCondition {
  id: string;
  name: string;
  indicator: string;
  operator: string;
  value: number;
  timeframe: string;
  enabled: boolean;
}

interface TradingStrategy {
  id: string;
  name: string;
  symbol: string;
  active: boolean;
  entryConditions: TradingCondition[];
  exitConditions: TradingCondition[];
  riskManagement: {
    stopLoss: number;
    takeProfit: number;
    maxPositionSize: number;
    maxDailyLoss: number;
    trailingStop: boolean;
    trailingStopDistance: number;
  };
  timeSettings: {
    startTime: string;
    endTime: string;
    tradingDays: string[];
  };
  performance: {
    totalTrades: number;
    winRate: number;
    totalPnL: number;
    maxDrawdown: number;
    sharpeRatio: number;
  };
}

interface Position {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  timestamp: number;
  strategyId: string;
}

const AutomaticTradingSystem: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'live' | 'strategies' | 'backtest'>('live');
  const [strategies, setStrategies] = useState<TradingStrategy[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [systemStatus, setSystemStatus] = useState<'running' | 'stopped' | 'paused'>('stopped');
  const [selectedStrategy, setSelectedStrategy] = useState<TradingStrategy | null>(null);
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const logsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (message: string) => {
    const timestamp = format(new Date(), 'HH:mm:ss');
    setLogs(prev => [...prev.slice(-99), `[${timestamp}] ${message}`]);
  };

  const handleStartSystem = () => {
    setSystemStatus('running');
    addLog('Automatic trading system started');
  };

  const handleStopSystem = () => {
    setSystemStatus('stopped');
    addLog('Automatic trading system stopped');
  };

  const handlePauseSystem = () => {
    setSystemStatus('paused');
    addLog('Automatic trading system paused');
  };

  const handleSaveStrategy = (strategy: TradingStrategy) => {
    const existingIndex = strategies.findIndex(s => s.id === strategy.id);
    if (existingIndex !== -1) {
      setStrategies(prev => prev.map((s, i) => i === existingIndex ? strategy : s));
      addLog(`Strategy "${strategy.name}" updated`);
    } else {
      setStrategies(prev => [...prev, strategy]);
      addLog(`Strategy "${strategy.name}" created`);
    }
  };

  const handleDeleteStrategy = (strategyId: string) => {
    const strategy = strategies.find(s => s.id === strategyId);
    if (strategy && confirm(`Are you sure you want to delete "${strategy.name}"?`)) {
      setStrategies(prev => prev.filter(s => s.id !== strategyId));
      addLog(`Strategy "${strategy.name}" deleted`);
    }
  };

  const toggleStrategyActive = (strategyId: string) => {
    setStrategies(prev => prev.map(s => 
      s.id === strategyId ? { ...s, active: !s.active } : s
    ));
    const strategy = strategies.find(s => s.id === strategyId);
    if (strategy) {
      addLog(`Strategy "${strategy.name}" ${!strategy.active ? 'activated' : 'deactivated'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-600 rounded-lg">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Automatic Trading System</h1>
              <p className="text-gray-400">AI-powered algorithmic trading platform</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
              systemStatus === 'running' ? 'bg-green-600' : 
              systemStatus === 'paused' ? 'bg-yellow-600' : 'bg-red-600'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                systemStatus === 'running' ? 'bg-green-300 animate-pulse' : 
                systemStatus === 'paused' ? 'bg-yellow-300' : 'bg-red-300'
              }`} />
              <span className="text-white font-medium capitalize">{systemStatus}</span>
            </div>
            
            <div className="flex space-x-2">
              {systemStatus === 'stopped' && (
                <button
                  onClick={handleStartSystem}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  <span>Start</span>
                </button>
              )}
              
              {systemStatus === 'running' && (
                <>
                  <button
                    onClick={handlePauseSystem}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
                  >
                    <Pause className="w-4 h-4" />
                    <span>Pause</span>
                  </button>
                  <button
                    onClick={handleStopSystem}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Stop</span>
                  </button>
                </>
              )}
              
              {systemStatus === 'paused' && (
                <>
                  <button
                    onClick={handleStartSystem}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    <span>Resume</span>
                  </button>
                  <button
                    onClick={handleStopSystem}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Stop</span>
                  </button>
                </>
              )}
              
              <button
                onClick={() => setShowSettingsModal(true)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </div>

        {/* Performance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total P&L</p>
                <p className="text-2xl font-bold text-green-400">+₹12,450</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Win Rate</p>
                <p className="text-2xl font-bold text-blue-400">68.5%</p>
              </div>
              <Target className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Strategies</p>
                <p className="text-2xl font-bold text-purple-400">{strategies.filter(s => s.active).length}</p>
              </div>
              <Brain className="w-8 h-8 text-purple-400" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Open Positions</p>
                <p className="text-2xl font-bold text-yellow-400">{positions.length}</p>
              </div>
              <Activity className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-gray-800 rounded-lg mb-6">
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('live')}
              className={`flex-1 py-4 px-6 font-medium text-center transition-colors ${
                activeTab === 'live'
                  ? 'text-purple-400 border-b-2 border-purple-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Zap className="h-4 w-4" />
                <span>Live Trading</span>
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('strategies')}
              className={`flex-1 py-4 px-6 font-medium text-center transition-colors ${
                activeTab === 'strategies'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Layers className="h-4 w-4" />
                <span>Strategies</span>
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('backtest')}
              className={`flex-1 py-4 px-6 font-medium text-center transition-colors ${
                activeTab === 'backtest'
                  ? 'text-green-400 border-b-2 border-green-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Backtest</span>
              </div>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'live' && (
          <LiveTradingEngine />
        )}

        {activeTab === 'strategies' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Trading Strategies</h2>
              <button
                onClick={() => setShowStrategyModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Strategy</span>
              </button>
            </div>
            
            <div className="space-y-4">
              {strategies.length === 0 ? (
                <div className="text-center py-12">
                  <Brain className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">No strategies configured</p>
                  <p className="text-gray-500 text-sm">Create your first trading strategy to get started</p>
                  <button
                    onClick={() => setShowStrategyModal(true)}
                    className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Create Strategy
                  </button>
                </div>
              ) : (
                strategies.map((strategy) => (
                  <div key={strategy.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => toggleStrategyActive(strategy.id)}
                          className={`w-3 h-3 rounded-full transition-colors ${
                            strategy.active ? 'bg-green-400' : 'bg-gray-500'
                          }`}
                        />
                        <h3 className="text-white font-medium">{strategy.name}</h3>
                        <span className="px-2 py-1 bg-gray-600 text-gray-300 text-xs rounded">
                          {strategy.symbol}
                        </span>
                        {strategy.active && (
                          <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => {
                            setSelectedStrategy(strategy);
                            setShowStrategyModal(true);
                          }}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteStrategy(strategy.id)}
                          className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">P&L</p>
                        <p className={`font-medium ${
                          strategy.performance.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          ₹{strategy.performance.totalPnL.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Win Rate</p>
                        <p className="text-white font-medium">
                          {strategy.performance.winRate.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Trades</p>
                        <p className="text-white font-medium">
                          {strategy.performance.totalTrades}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Sharpe</p>
                        <p className="text-white font-medium">
                          {strategy.performance.sharpeRatio.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-600">
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Entry Conditions: {strategy.entryConditions.length}</span>
                        <span>Exit Conditions: {strategy.exitConditions.length}</span>
                        <span>SL: ₹{strategy.riskManagement.stopLoss}</span>
                        <span>TP: ₹{strategy.riskManagement.takeProfit}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'backtest' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-6">Strategy Backtesting</h2>
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">Backtesting Module</p>
              <p className="text-gray-500 text-sm">Test your strategies against historical data</p>
              <button className="mt-4 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                Coming Soon
              </button>
            </div>
          </div>
        )}

        {/* Strategy Builder Modal */}
        <StrategyBuilder
          isOpen={showStrategyModal}
          onClose={() => {
            setShowStrategyModal(false);
            setSelectedStrategy(null);
          }}
          onSave={handleSaveStrategy}
          editingStrategy={selectedStrategy}
        />
      </div>
    </div>
  );
};

export default AutomaticTradingSystem;