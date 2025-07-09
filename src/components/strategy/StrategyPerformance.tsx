import React from 'react';
import { Strategy } from '../../pages/StrategyPage';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Activity, 
  DollarSign,
  BarChart3,
  Zap
} from 'lucide-react';

interface StrategyPerformanceProps {
  strategy: Strategy;
}

const StrategyPerformance: React.FC<StrategyPerformanceProps> = ({ strategy }) => {
  const { performance } = strategy;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getPerformanceColor = (value: number) => {
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getWinRateColor = (winRate: number) => {
    if (winRate >= 60) return 'text-green-400';
    if (winRate >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getSharpeColor = (sharpe: number) => {
    if (sharpe >= 1) return 'text-green-400';
    if (sharpe >= 0.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center space-x-3 mb-6">
        <BarChart3 className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-white">Performance</h3>
      </div>

      <div className="space-y-4">
        {/* Total P&L */}
        <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
          <div className="flex items-center space-x-3">
            <DollarSign className={`w-5 h-5 ${getPerformanceColor(performance.totalPnL)}`} />
            <span className="text-gray-300">Total P&L</span>
          </div>
          <span className={`font-bold ${getPerformanceColor(performance.totalPnL)}`}>
            {performance.totalPnL >= 0 ? '+' : ''}{formatCurrency(performance.totalPnL)}
          </span>
        </div>

        {/* Win Rate */}
        <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
          <div className="flex items-center space-x-3">
            <Target className={`w-5 h-5 ${getWinRateColor(performance.winRate)}`} />
            <span className="text-gray-300">Win Rate</span>
          </div>
          <span className={`font-bold ${getWinRateColor(performance.winRate)}`}>
            {performance.winRate.toFixed(1)}%
          </span>
        </div>

        {/* Total Trades */}
        <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
          <div className="flex items-center space-x-3">
            <Activity className="w-5 h-5 text-blue-400" />
            <span className="text-gray-300">Total Trades</span>
          </div>
          <span className="font-bold text-white">
            {performance.totalTrades}
          </span>
        </div>

        {/* Max Drawdown */}
        <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
          <div className="flex items-center space-x-3">
            <TrendingDown className="w-5 h-5 text-red-400" />
            <span className="text-gray-300">Max Drawdown</span>
          </div>
          <span className="font-bold text-red-400">
            -{formatCurrency(Math.abs(performance.maxDrawdown))}
          </span>
        </div>

        {/* Sharpe Ratio */}
        <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
          <div className="flex items-center space-x-3">
            <Zap className={`w-5 h-5 ${getSharpeColor(performance.sharpeRatio)}`} />
            <span className="text-gray-300">Sharpe Ratio</span>
          </div>
          <span className={`font-bold ${getSharpeColor(performance.sharpeRatio)}`}>
            {performance.sharpeRatio.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="mt-6 p-4 bg-gray-700 rounded-lg">
        <h4 className="text-sm font-medium text-white mb-3">Performance Summary</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Avg Trade P&L:</span>
            <span className={`${getPerformanceColor(performance.totalPnL)}`}>
              {performance.totalTrades > 0 
                ? formatCurrency(performance.totalPnL / performance.totalTrades)
                : formatCurrency(0)
              }
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Win/Loss Ratio:</span>
            <span className="text-white">
              {performance.totalTrades > 0 
                ? `${Math.round(performance.totalTrades * performance.winRate / 100)}/${performance.totalTrades - Math.round(performance.totalTrades * performance.winRate / 100)}`
                : '0/0'
              }
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Risk Rating:</span>
            <span className={`${
              performance.sharpeRatio >= 1 ? 'text-green-400' :
              performance.sharpeRatio >= 0.5 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {performance.sharpeRatio >= 1 ? 'Low' :
               performance.sharpeRatio >= 0.5 ? 'Medium' : 'High'}
            </span>
          </div>
        </div>
      </div>

      {/* Strategy Status */}
      <div className="mt-4 p-3 rounded-lg border border-gray-600">
        <div className="flex items-center justify-between">
          <span className="text-gray-300 text-sm">Strategy Status</span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            strategy.enabled 
              ? 'bg-green-900 text-green-300 bg-opacity-50' 
              : 'bg-gray-900 text-gray-400 bg-opacity-50'
          }`}>
            {strategy.enabled ? 'ACTIVE' : 'INACTIVE'}
          </span>
        </div>
        {strategy.lastSignal && (
          <div className="mt-2 text-xs text-gray-400">
            Last signal: {strategy.lastSignal.action} at ₹{strategy.lastSignal.price.toFixed(2)}
          </div>
        )}
      </div>
    </div>
  );
};

export default StrategyPerformance;