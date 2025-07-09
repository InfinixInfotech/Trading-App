import React, { useState } from 'react';
import { Strategy } from '../../pages/StrategyPage';
import { Settings, Save, RotateCcw, Info } from 'lucide-react';

interface StrategyConfigProps {
  strategy: Strategy;
  onUpdate: (updates: Partial<Strategy>) => void;
}

const StrategyConfig: React.FC<StrategyConfigProps> = ({ strategy, onUpdate }) => {
  const [parameters, setParameters] = useState(strategy.parameters);
  const [hasChanges, setHasChanges] = useState(false);

  const handleParameterChange = (key: string, value: any) => {
    const newParameters = { ...parameters, [key]: value };
    setParameters(newParameters);
    setHasChanges(true);
  };

  const handleSave = () => {
    onUpdate({ parameters });
    setHasChanges(false);
  };

  const handleReset = () => {
    setParameters(strategy.parameters);
    setHasChanges(false);
  };

  const getParameterConfig = () => {
    switch (strategy.type) {
      case 'ema_crossover':
        return {
          fastPeriod: { type: 'number', label: 'Fast EMA Period', min: 5, max: 50, step: 1 },
          slowPeriod: { type: 'number', label: 'Slow EMA Period', min: 10, max: 100, step: 1 },
          quantity: { type: 'number', label: 'Quantity', min: 1, max: 1000, step: 1 },
          stopLoss: { type: 'number', label: 'Stop Loss (%)', min: 0.5, max: 10, step: 0.1 },
          takeProfit: { type: 'number', label: 'Take Profit (%)', min: 1, max: 20, step: 0.1 },
          trailingStop: { type: 'boolean', label: 'Enable Trailing Stop' },
        };
      
      case 'rsi_oversold':
        return {
          rsiPeriod: { type: 'number', label: 'RSI Period', min: 5, max: 50, step: 1 },
          oversoldLevel: { type: 'number', label: 'Oversold Level', min: 10, max: 40, step: 1 },
          overboughtLevel: { type: 'number', label: 'Overbought Level', min: 60, max: 90, step: 1 },
          quantity: { type: 'number', label: 'Quantity', min: 1, max: 1000, step: 1 },
          stopLoss: { type: 'number', label: 'Stop Loss (%)', min: 0.5, max: 10, step: 0.1 },
          takeProfit: { type: 'number', label: 'Take Profit (%)', min: 1, max: 20, step: 0.1 },
        };
      
      case 'sma_trend':
        return {
          shortPeriod: { type: 'number', label: 'Short SMA Period', min: 5, max: 50, step: 1 },
          longPeriod: { type: 'number', label: 'Long SMA Period', min: 20, max: 200, step: 1 },
          trendStrength: { type: 'number', label: 'Trend Strength', min: 0.1, max: 2, step: 0.1 },
          quantity: { type: 'number', label: 'Quantity', min: 1, max: 1000, step: 1 },
          stopLoss: { type: 'number', label: 'Stop Loss (%)', min: 0.5, max: 10, step: 0.1 },
          takeProfit: { type: 'number', label: 'Take Profit (%)', min: 1, max: 20, step: 0.1 },
        };
      
      case 'bollinger_bands':
        return {
          period: { type: 'number', label: 'BB Period', min: 10, max: 50, step: 1 },
          stdDev: { type: 'number', label: 'Standard Deviation', min: 1, max: 3, step: 0.1 },
          quantity: { type: 'number', label: 'Quantity', min: 1, max: 1000, step: 1 },
          stopLoss: { type: 'number', label: 'Stop Loss (%)', min: 0.5, max: 10, step: 0.1 },
          takeProfit: { type: 'number', label: 'Take Profit (%)', min: 1, max: 20, step: 0.1 },
          meanReversion: { type: 'boolean', label: 'Mean Reversion Mode' },
        };
      
      default:
        return {};
    }
  };

  const renderParameterInput = (key: string, value: any, config: any) => {
    switch (config.type) {
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleParameterChange(key, parseFloat(e.target.value))}
            min={config.min}
            max={config.max}
            step={config.step || 1}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );
      
      case 'boolean':
        return (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => handleParameterChange(key, e.target.checked)}
              className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-300">Enabled</span>
          </label>
        );
      
      default:
        return null;
    }
  };

  const parameterConfig = getParameterConfig();

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Settings className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Strategy Configuration</h3>
        </div>
        
        {hasChanges && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleReset}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(parameterConfig).map(([key, config]) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-300">
                {config.label}
              </label>
              {config.type === 'number' && (
                <Info className="w-3 h-3 text-gray-500" title={`Range: ${config.min} - ${config.max}`} />
              )}
            </div>
            {renderParameterInput(key, parameters[key], config)}
          </div>
        ))}
      </div>

      {/* Strategy Description */}
      <div className="mt-6 p-4 bg-gray-700 rounded-lg">
        <h4 className="text-sm font-medium text-white mb-2">Strategy Description</h4>
        <p className="text-sm text-gray-300">
          {strategy.type === 'ema_crossover' && 
            'Trades based on exponential moving average crossovers. Buys when fast EMA crosses above slow EMA, sells when it crosses below.'
          }
          {strategy.type === 'rsi_oversold' && 
            'Uses RSI indicator to identify oversold and overbought conditions. Buys when RSI is below oversold level, sells when above overbought level.'
          }
          {strategy.type === 'sma_trend' && 
            'Follows trends using simple moving averages. Enters positions when price is trending strongly in one direction.'
          }
          {strategy.type === 'bollinger_bands' && 
            'Mean reversion strategy using Bollinger Bands. Buys when price touches lower band, sells when it touches upper band.'
          }
        </p>
      </div>

      {hasChanges && (
        <div className="mt-4 p-3 bg-yellow-900 bg-opacity-30 rounded-lg border border-yellow-700">
          <div className="flex items-center space-x-2 text-yellow-300">
            <Info className="w-4 h-4" />
            <span className="text-sm">You have unsaved changes. Click Save to apply them.</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StrategyConfig;