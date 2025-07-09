import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import StrategyList from '../components/strategy/StrategyList';
import StrategyChart from '../components/strategy/StrategyChart';
import StrategyConfig from '../components/strategy/StrategyConfig';
import StrategyPerformance from '../components/strategy/StrategyPerformance';
import { strategyService } from '../services/strategyService';
import { 
  Brain, 
  TrendingUp, 
  Settings, 
  Play, 
  Pause, 
  BarChart3,
  Activity,
  AlertCircle,
  CheckCircle,
  Zap
} from 'lucide-react';

export interface Strategy {
  id: string;
  name: string;
  type: 'ema_crossover' | 'rsi_oversold' | 'sma_trend' | 'bollinger_bands';
  symbol: string;
  enabled: boolean;
  parameters: Record<string, any>;
  performance: {
    totalTrades: number;
    winRate: number;
    totalPnL: number;
    maxDrawdown: number;
    sharpeRatio: number;
  };
  lastSignal?: {
    action: 'BUY' | 'SELL' | 'HOLD';
    timestamp: number;
    price: number;
    confidence: number;
  };
}

const StrategyPage: React.FC = () => {
  const { user } = useAuth();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [isAutoTradingEnabled, setIsAutoTradingEnabled] = useState(false);
  const [marketData, setMarketData] = useState<any>({});
  const [systemStatus, setSystemStatus] = useState<'running' | 'stopped' | 'error'>('stopped');
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    initializeStrategies();
    fetchSystemStatus();
    
    // Set up real-time updates
    const interval = setInterval(() => {
      if (isAutoTradingEnabled) {
        fetchMarketData();
        fetchSystemStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoTradingEnabled]);

  const initializeStrategies = async () => {
    try {
      const data = await strategyService.getStrategies();
      setStrategies(data);
      if (data.length > 0) {
        setSelectedStrategy(data[0]);
      }
    } catch (error) {
      console.error('Failed to load strategies:', error);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const status = await strategyService.getSystemStatus();
      setSystemStatus(status.status);
      setIsAutoTradingEnabled(status.autoTradingEnabled);
      setLogs(status.logs || []);
    } catch (error) {
      console.error('Failed to fetch system status:', error);
      setSystemStatus('error');
    }
  };

  const fetchMarketData = async () => {
    try {
      const symbols = strategies.map(s => s.symbol);
      const data = await strategyService.getMarketData(symbols);
      setMarketData(data);
    } catch (error) {
      console.error('Failed to fetch market data:', error);
    }
  };

  const handleStrategyToggle = async (strategyId: string, enabled: boolean) => {
    try {
      await strategyService.updateStrategy(strategyId, { enabled });
      setStrategies(prev => 
        prev.map(s => s.id === strategyId ? { ...s, enabled } : s)
      );
    } catch (error) {
      console.error('Failed to update strategy:', error);
    }
  };

  const handleStrategyUpdate = async (strategyId: string, updates: Partial<Strategy>) => {
    try {
      await strategyService.updateStrategy(strategyId, updates);
      setStrategies(prev => 
        prev.map(s => s.id === strategyId ? { ...s, ...updates } : s)
      );
      if (selectedStrategy?.id === strategyId) {
        setSelectedStrategy(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (error) {
      console.error('Failed to update strategy:', error);
    }
  };

  const handleAutoTradingToggle = async () => {
    try {
      const newStatus = !isAutoTradingEnabled;
      await strategyService.setAutoTrading(newStatus);
      setIsAutoTradingEnabled(newStatus);
      
      if (newStatus) {
        setSystemStatus('running');
      } else {
        setSystemStatus('stopped');
      }
    } catch (error) {
      console.error('Failed to toggle auto trading:', error);
      setSystemStatus('error');
    }
  };

  const getStatusColor = () => {
    switch (systemStatus) {
      case 'running': return 'text-green-400 bg-green-900';
      case 'stopped': return 'text-yellow-400 bg-yellow-900';
      case 'error': return 'text-red-400 bg-red-900';
      default: return 'text-gray-400 bg-gray-900';
    }
  };

  const getStatusIcon = () => {
    switch (systemStatus) {
      case 'running': return <CheckCircle className="w-4 h-4" />;
      case 'stopped': return <Pause className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-600 rounded-lg">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Strategy Trading</h1>
              <p className="text-gray-400">Automated trading with predefined strategies</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${getStatusColor()} bg-opacity-20 border border-current`}>
              {getStatusIcon()}
              <span className="font-medium capitalize">{systemStatus}</span>
            </div>
            
            <button
              onClick={handleAutoTradingToggle}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
                isAutoTradingEnabled
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isAutoTradingEnabled ? (
                <>
                  <Pause className="w-5 h-5" />
                  <span>Stop Auto Trading</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  <span>Start Auto Trading</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Performance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Strategies</p>
                <p className="text-2xl font-bold text-blue-400">
                  {strategies.filter(s => s.enabled).length}
                </p>
              </div>
              <Zap className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total P&L</p>
                <p className="text-2xl font-bold text-green-400">
                  +₹{strategies.reduce((sum, s) => sum + s.performance.totalPnL, 0).toFixed(2)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Win Rate</p>
                <p className="text-2xl font-bold text-purple-400">
                  {strategies.length > 0 
                    ? (strategies.reduce((sum, s) => sum + s.performance.winRate, 0) / strategies.length).toFixed(1)
                    : 0
                  }%
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-400" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Trades</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {strategies.reduce((sum, s) => sum + s.performance.totalTrades, 0)}
                </p>
              </div>
              <Activity className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Strategy List */}
          <div className="lg:col-span-1">
            <StrategyList
              strategies={strategies}
              selectedStrategy={selectedStrategy}
              onStrategySelect={setSelectedStrategy}
              onStrategyToggle={handleStrategyToggle}
              marketData={marketData}
            />
          </div>

          {/* Chart and Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {selectedStrategy && (
              <>
                <StrategyChart
                  strategy={selectedStrategy}
                  marketData={marketData[selectedStrategy.symbol]}
                />
                <StrategyConfig
                  strategy={selectedStrategy}
                  onUpdate={(updates) => handleStrategyUpdate(selectedStrategy.id, updates)}
                />
              </>
            )}
          </div>

          {/* Performance and Logs */}
          <div className="lg:col-span-1 space-y-6">
            {selectedStrategy && (
              <StrategyPerformance strategy={selectedStrategy} />
            )}
            
            {/* System Logs */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">System Logs</h3>
              <div className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs">
                {logs.length === 0 ? (
                  <p className="text-gray-500">No logs available</p>
                ) : (
                  logs.slice(-50).map((log, index) => (
                    <div key={index} className="text-gray-300 mb-1">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrategyPage;