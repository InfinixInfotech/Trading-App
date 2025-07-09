import React from 'react';
import { Strategy } from '../../pages/StrategyPage';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart3,
  Target,
  Zap,
  Pause,
  Play
} from 'lucide-react';
import { format } from 'date-fns';

interface StrategyListProps {
  strategies: Strategy[];
  selectedStrategy: Strategy | null;
  onStrategySelect: (strategy: Strategy) => void;
  onStrategyToggle: (strategyId: string, enabled: boolean) => void;
  marketData: Record<string, any>;
}

const StrategyList: React.FC<StrategyListProps> = ({
  strategies,
  selectedStrategy,
  onStrategySelect,
  onStrategyToggle,
  marketData
}) => {
  const getStrategyIcon = (type: string) => {
    switch (type) {
      case 'ema_crossover': return <TrendingUp className="w-5 h-5" />;
      case 'rsi_oversold': return <Target className="w-5 h-5" />;
      case 'sma_trend': return <BarChart3 className="w-5 h-5" />;
      case 'bollinger_bands': return <Activity className="w-5 h-5" />;
      default: return <Zap className="w-5 h-5" />;
    }
  };

  const getStrategyDescription = (type: string) => {
    switch (type) {
      case 'ema_crossover': return 'EMA 9/21 Crossover';
      case 'rsi_oversold': return 'RSI Oversold/Overbought';
      case 'sma_trend': return 'SMA Trend Following';
      case 'bollinger_bands': return 'Bollinger Bands Mean Reversion';
      default: return 'Custom Strategy';
    }
  };

  const getSignalColor = (action?: string) => {
    switch (action) {
      case 'BUY': return 'text-green-400 bg-green-900';
      case 'SELL': return 'text-red-400 bg-red-900';
      default: return 'text-gray-400 bg-gray-900';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Strategies</h2>
        <span className="text-sm text-gray-400">{strategies.length} total</span>
      </div>

      <div className="space-y-4">
        {strategies.map((strategy) => {
          const currentPrice = marketData[strategy.symbol]?.price || 0;
          const isSelected = selectedStrategy?.id === strategy.id;
          
          return (
            <div
              key={strategy.id}
              onClick={() => onStrategySelect(strategy)}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-900 bg-opacity-20'
                  : 'border-gray-600 bg-gray-700 hover:bg-gray-650'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    strategy.enabled ? 'bg-green-600' : 'bg-gray-600'
                  }`}>
                    {getStrategyIcon(strategy.type)}
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{strategy.name}</h3>
                    <p className="text-gray-400 text-sm">{getStrategyDescription(strategy.type)}</p>
                  </div>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStrategyToggle(strategy.id, !strategy.enabled);
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    strategy.enabled
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {strategy.enabled ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                <div>
                  <span className="text-gray-400">Symbol:</span>
                  <p className="text-white font-medium">{strategy.symbol.replace('.NS', '')}</p>
                </div>
                <div>
                  <span className="text-gray-400">Price:</span>
                  <p className="text-white font-medium">₹{currentPrice.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-gray-400">P&L:</span>
                  <p className={`font-medium ${
                    strategy.performance.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {strategy.performance.totalPnL >= 0 ? '+' : ''}₹{strategy.performance.totalPnL.toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Win Rate:</span>
                  <p className="text-white font-medium">{strategy.performance.winRate.toFixed(1)}%</p>
                </div>
              </div>

              {strategy.lastSignal && (
                <div className="flex items-center justify-between pt-3 border-t border-gray-600">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getSignalColor(strategy.lastSignal.action)} bg-opacity-20`}>
                      {strategy.lastSignal.action}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {strategy.lastSignal.confidence}% confidence
                    </span>
                  </div>
                  <span className="text-gray-400 text-xs">
                    {format(new Date(strategy.lastSignal.timestamp), 'HH:mm:ss')}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  strategy.enabled 
                    ? 'bg-green-900 text-green-300 bg-opacity-50 animate-pulse' 
                    : 'bg-gray-900 text-gray-400 bg-opacity-50'
                }`}>
                  {strategy.enabled ? '🔴 LIVE TRADING' : 'INACTIVE'}
                </span>
                <span className="text-gray-400 text-xs">
                  {strategy.performance.totalTrades} trades
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StrategyList;