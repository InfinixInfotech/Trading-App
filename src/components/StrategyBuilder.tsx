import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Settings, 
  Target, 
  Shield, 
  Clock,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  Save,
  X
} from 'lucide-react';

interface TradingCondition {
  id: string;
  name: string;
  indicator: string;
  operator: string;
  value: number;
  timeframe: string;
  enabled: boolean;
}

interface RiskManagement {
  stopLoss: number;
  takeProfit: number;
  maxPositionSize: number;
  maxDailyLoss: number;
  trailingStop: boolean;
  trailingStopDistance: number;
}

interface TimeSettings {
  startTime: string;
  endTime: string;
  tradingDays: string[];
}

interface StrategyBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (strategy: any) => void;
  editingStrategy?: any;
}

const StrategyBuilder: React.FC<StrategyBuilderProps> = ({
  isOpen,
  onClose,
  onSave,
  editingStrategy
}) => {
  const [strategyName, setStrategyName] = useState(editingStrategy?.name || '');
  const [symbol, setSymbol] = useState(editingStrategy?.symbol || 'BANKNIFTY');
  const [entryConditions, setEntryConditions] = useState<TradingCondition[]>(
    editingStrategy?.entryConditions || []
  );
  const [exitConditions, setExitConditions] = useState<TradingCondition[]>(
    editingStrategy?.exitConditions || []
  );
  const [riskManagement, setRiskManagement] = useState<RiskManagement>(
    editingStrategy?.riskManagement || {
      stopLoss: 50,
      takeProfit: 100,
      maxPositionSize: 25,
      maxDailyLoss: 500,
      trailingStop: false,
      trailingStopDistance: 30
    }
  );
  const [timeSettings, setTimeSettings] = useState<TimeSettings>(
    editingStrategy?.timeSettings || {
      startTime: '09:15',
      endTime: '15:30',
      tradingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    }
  );

  const indicators = [
    { value: 'RSI', label: 'RSI (Relative Strength Index)' },
    { value: 'SMA_20', label: 'SMA 20 (Simple Moving Average)' },
    { value: 'SMA_50', label: 'SMA 50 (Simple Moving Average)' },
    { value: 'EMA_9', label: 'EMA 9 (Exponential Moving Average)' },
    { value: 'EMA_21', label: 'EMA 21 (Exponential Moving Average)' },
    { value: 'EMA_CROSS', label: 'EMA Crossover (9 vs 21)' },
    { value: 'MACD', label: 'MACD (Moving Average Convergence Divergence)' },
    { value: 'MACD_SIGNAL', label: 'MACD Signal Line' },
    { value: 'BOLLINGER_UPPER', label: 'Bollinger Upper Band' },
    { value: 'BOLLINGER_LOWER', label: 'Bollinger Lower Band' },
    { value: 'STOCHASTIC_K', label: 'Stochastic %K' },
    { value: 'STOCHASTIC_D', label: 'Stochastic %D' },
    { value: 'ATR', label: 'ATR (Average True Range)' },
    { value: 'VOLUME', label: 'Volume Ratio' },
    { value: 'PRICE', label: 'Current Price' }
  ];

  const operators = [
    { value: '>', label: 'Greater than (>)' },
    { value: '<', label: 'Less than (<)' },
    { value: '>=', label: 'Greater than or equal (>=)' },
    { value: '<=', label: 'Less than or equal (<=)' },
    { value: '==', label: 'Equal to (==)' }
  ];

  const timeframes = [
    { value: '1m', label: '1 Minute' },
    { value: '5m', label: '5 Minutes' },
    { value: '15m', label: '15 Minutes' },
    { value: '30m', label: '30 Minutes' },
    { value: '1h', label: '1 Hour' }
  ];

  const symbols = [
    'BANKNIFTY', 'NIFTY', 'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK'
  ];

  const weekdays = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ];

  const addCondition = (type: 'entry' | 'exit') => {
    const newCondition: TradingCondition = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: 'New Condition',
      indicator: 'RSI',
      operator: '>',
      value: 50,
      timeframe: '5m',
      enabled: true
    };

    if (type === 'entry') {
      setEntryConditions([...entryConditions, newCondition]);
    } else {
      setExitConditions([...exitConditions, newCondition]);
    }
  };

  const updateCondition = (id: string, field: string, value: any, type: 'entry' | 'exit') => {
    const updateFn = (conditions: TradingCondition[]) =>
      conditions.map(condition =>
        condition.id === id ? { ...condition, [field]: value } : condition
      );

    if (type === 'entry') {
      setEntryConditions(updateFn);
    } else {
      setExitConditions(updateFn);
    }
  };

  const removeCondition = (id: string, type: 'entry' | 'exit') => {
    if (type === 'entry') {
      setEntryConditions(entryConditions.filter(c => c.id !== id));
    } else {
      setExitConditions(exitConditions.filter(c => c.id !== id));
    }
  };

  const handleSave = () => {
    if (!strategyName.trim()) {
      alert('Please enter a strategy name');
      return;
    }

    if (entryConditions.length === 0) {
      alert('Please add at least one entry condition');
      return;
    }

    const strategy = {
      id: editingStrategy?.id || `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: strategyName,
      symbol,
      active: false,
      entryConditions,
      exitConditions,
      riskManagement,
      timeSettings,
      performance: editingStrategy?.performance || {
        totalTrades: 0,
        winRate: 0,
        totalPnL: 0,
        maxDrawdown: 0,
        sharpeRatio: 0
      }
    };

    onSave(strategy);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">
              {editingStrategy ? 'Edit Strategy' : 'Create New Strategy'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Basic Settings */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Basic Settings</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Strategy Name *
                </label>
                <input
                  type="text"
                  value={strategyName}
                  onChange={(e) => setStrategyName(e.target.value)}
                  placeholder="Enter strategy name"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Trading Symbol *
                </label>
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {symbols.map(sym => (
                    <option key={sym} value={sym}>{sym}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Entry Conditions */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-400" />
                <span>Entry Conditions</span>
              </h3>
              <button
                onClick={() => addCondition('entry')}
                className="flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Condition</span>
              </button>
            </div>

            <div className="space-y-4">
              {entryConditions.map((condition, index) => (
                <div key={condition.id} className="p-4 bg-gray-700 rounded-lg border border-gray-600">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        value={condition.name}
                        onChange={(e) => updateCondition(condition.id, 'name', e.target.value, 'entry')}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Indicator
                      </label>
                      <select
                        value={condition.indicator}
                        onChange={(e) => updateCondition(condition.id, 'indicator', e.target.value, 'entry')}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {indicators.map(ind => (
                          <option key={ind.value} value={ind.value}>{ind.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Operator
                      </label>
                      <select
                        value={condition.operator}
                        onChange={(e) => updateCondition(condition.id, 'operator', e.target.value, 'entry')}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {operators.map(op => (
                          <option key={op.value} value={op.value}>{op.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Value
                      </label>
                      <input
                        type="number"
                        value={condition.value}
                        onChange={(e) => updateCondition(condition.id, 'value', parseFloat(e.target.value), 'entry')}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Timeframe
                      </label>
                      <select
                        value={condition.timeframe}
                        onChange={(e) => updateCondition(condition.id, 'timeframe', e.target.value, 'entry')}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {timeframes.map(tf => (
                          <option key={tf.value} value={tf.value}>{tf.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={condition.enabled}
                          onChange={(e) => updateCondition(condition.id, 'enabled', e.target.checked, 'entry')}
                          className="rounded bg-gray-600 border-gray-500 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-300">Enabled</span>
                      </label>
                      <button
                        onClick={() => removeCondition(condition.id, 'entry')}
                        className="p-2 text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Exit Conditions */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                <TrendingDown className="h-5 w-5 text-red-400" />
                <span>Exit Conditions</span>
              </h3>
              <button
                onClick={() => addCondition('exit')}
                className="flex items-center space-x-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Condition</span>
              </button>
            </div>

            <div className="space-y-4">
              {exitConditions.map((condition) => (
                <div key={condition.id} className="p-4 bg-gray-700 rounded-lg border border-gray-600">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        value={condition.name}
                        onChange={(e) => updateCondition(condition.id, 'name', e.target.value, 'exit')}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Indicator
                      </label>
                      <select
                        value={condition.indicator}
                        onChange={(e) => updateCondition(condition.id, 'indicator', e.target.value, 'exit')}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {indicators.map(ind => (
                          <option key={ind.value} value={ind.value}>{ind.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Operator
                      </label>
                      <select
                        value={condition.operator}
                        onChange={(e) => updateCondition(condition.id, 'operator', e.target.value, 'exit')}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {operators.map(op => (
                          <option key={op.value} value={op.value}>{op.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Value
                      </label>
                      <input
                        type="number"
                        value={condition.value}
                        onChange={(e) => updateCondition(condition.id, 'value', parseFloat(e.target.value), 'exit')}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Timeframe
                      </label>
                      <select
                        value={condition.timeframe}
                        onChange={(e) => updateCondition(condition.id, 'timeframe', e.target.value, 'exit')}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {timeframes.map(tf => (
                          <option key={tf.value} value={tf.value}>{tf.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={condition.enabled}
                          onChange={(e) => updateCondition(condition.id, 'enabled', e.target.checked, 'exit')}
                          className="rounded bg-gray-600 border-gray-500 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-300">Enabled</span>
                      </label>
                      <button
                        onClick={() => removeCondition(condition.id, 'exit')}
                        className="p-2 text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Management */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <Shield className="h-5 w-5 text-yellow-400" />
              <span>Risk Management</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Stop Loss (₹)
                </label>
                <input
                  type="number"
                  value={riskManagement.stopLoss}
                  onChange={(e) => setRiskManagement({
                    ...riskManagement,
                    stopLoss: parseFloat(e.target.value)
                  })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Take Profit (₹)
                </label>
                <input
                  type="number"
                  value={riskManagement.takeProfit}
                  onChange={(e) => setRiskManagement({
                    ...riskManagement,
                    takeProfit: parseFloat(e.target.value)
                  })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Max Position Size
                </label>
                <input
                  type="number"
                  value={riskManagement.maxPositionSize}
                  onChange={(e) => setRiskManagement({
                    ...riskManagement,
                    maxPositionSize: parseInt(e.target.value)
                  })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Max Daily Loss (₹)
                </label>
                <input
                  type="number"
                  value={riskManagement.maxDailyLoss}
                  onChange={(e) => setRiskManagement({
                    ...riskManagement,
                    maxDailyLoss: parseFloat(e.target.value)
                  })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Trailing Stop Distance (₹)
                </label>
                <input
                  type="number"
                  value={riskManagement.trailingStopDistance}
                  onChange={(e) => setRiskManagement({
                    ...riskManagement,
                    trailingStopDistance: parseFloat(e.target.value)
                  })}
                  disabled={!riskManagement.trailingStop}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>

              <div className="flex items-end">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={riskManagement.trailingStop}
                    onChange={(e) => setRiskManagement({
                      ...riskManagement,
                      trailingStop: e.target.checked
                    })}
                    className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">Enable Trailing Stop</span>
                </label>
              </div>
            </div>
          </div>

          {/* Time Settings */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-400" />
              <span>Time Settings</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={timeSettings.startTime}
                  onChange={(e) => setTimeSettings({
                    ...timeSettings,
                    startTime: e.target.value
                  })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  value={timeSettings.endTime}
                  onChange={(e) => setTimeSettings({
                    ...timeSettings,
                    endTime: e.target.value
                  })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Trading Days
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {weekdays.map(day => (
                  <label key={day} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={timeSettings.tradingDays.includes(day)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTimeSettings({
                            ...timeSettings,
                            tradingDays: [...timeSettings.tradingDays, day]
                          });
                        } else {
                          setTimeSettings({
                            ...timeSettings,
                            tradingDays: timeSettings.tradingDays.filter(d => d !== day)
                          });
                        }
                      }}
                      className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-300">{day}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-700 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>Save Strategy</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StrategyBuilder;