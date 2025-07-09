import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import { Strategy } from '../../pages/StrategyPage';
import { strategyService } from '../../services/strategyService';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

interface StrategyChartProps {
  strategy: Strategy;
  marketData?: any;
}

interface ChartData {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface IndicatorData {
  time: UTCTimestamp;
  value: number;
}

interface SignalData {
  time: UTCTimestamp;
  position: 'aboveBar' | 'belowBar';
  color: string;
  shape: 'arrowUp' | 'arrowDown';
  text: string;
}

const StrategyChart: React.FC<StrategyChartProps> = ({ strategy, marketData }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const indicatorSeriesRef = useRef<{ [key: string]: ISeriesApi<'Line'> }>({});
  
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [indicators, setIndicators] = useState<{ [key: string]: IndicatorData[] }>({});
  const [signals, setSignals] = useState<SignalData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Initialize chart
    chartRef.current = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: '#1f2937' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#374151' },
        horzLines: { color: '#374151' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#4b5563',
      },
      rightPriceScale: {
        borderColor: '#4b5563',
      },
    });

    // Add candlestick series
    candleSeriesRef.current = chartRef.current.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderDownColor: '#ef4444',
      borderUpColor: '#10b981',
      wickDownColor: '#ef4444',
      wickUpColor: '#10b981',
    });

    // Add indicator series based on strategy type
    addIndicatorSeries();

    // Handle resize
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (strategy) {
      loadChartData();
    }
  }, [strategy]);

  useEffect(() => {
    if (marketData && chartData.length > 0) {
      updateRealTimeData();
    }
  }, [marketData]);

  const addIndicatorSeries = () => {
    if (!chartRef.current) return;

    indicatorSeriesRef.current = {};

    switch (strategy.type) {
      case 'ema_crossover':
        indicatorSeriesRef.current.ema9 = chartRef.current.addLineSeries({
          color: '#3b82f6',
          lineWidth: 2,
          title: 'EMA 9',
        });
        indicatorSeriesRef.current.ema21 = chartRef.current.addLineSeries({
          color: '#f59e0b',
          lineWidth: 2,
          title: 'EMA 21',
        });
        break;
      
      case 'sma_trend':
        indicatorSeriesRef.current.sma20 = chartRef.current.addLineSeries({
          color: '#8b5cf6',
          lineWidth: 2,
          title: 'SMA 20',
        });
        indicatorSeriesRef.current.sma50 = chartRef.current.addLineSeries({
          color: '#06b6d4',
          lineWidth: 2,
          title: 'SMA 50',
        });
        break;
      
      case 'bollinger_bands':
        indicatorSeriesRef.current.bbUpper = chartRef.current.addLineSeries({
          color: '#ec4899',
          lineWidth: 1,
          title: 'BB Upper',
        });
        indicatorSeriesRef.current.bbMiddle = chartRef.current.addLineSeries({
          color: '#6b7280',
          lineWidth: 1,
          title: 'BB Middle',
        });
        indicatorSeriesRef.current.bbLower = chartRef.current.addLineSeries({
          color: '#ec4899',
          lineWidth: 1,
          title: 'BB Lower',
        });
        break;
    }
  };

  const loadChartData = async () => {
    try {
      setLoading(true);
      const data = await strategyService.getChartData(strategy.symbol, strategy.type);
      
      setChartData(data.candles);
      setIndicators(data.indicators);
      setSignals(data.signals);

      // Update chart with data
      if (candleSeriesRef.current) {
        candleSeriesRef.current.setData(data.candles);
      }

      // Update indicators
      Object.entries(data.indicators).forEach(([key, values]) => {
        if (indicatorSeriesRef.current[key]) {
          indicatorSeriesRef.current[key].setData(values);
        }
      });

      // Add signals as markers
      if (candleSeriesRef.current && data.signals.length > 0) {
        candleSeriesRef.current.setMarkers(data.signals);
      }

    } catch (error) {
      console.error('Failed to load chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateRealTimeData = () => {
    if (!marketData || !candleSeriesRef.current) return;

    const now = Math.floor(Date.now() / 1000) as UTCTimestamp;
    const newCandle: ChartData = {
      time: now,
      open: marketData.open || marketData.price,
      high: marketData.high || marketData.price,
      low: marketData.low || marketData.price,
      close: marketData.price,
    };

    // Update the last candle or add new one
    const updatedData = [...chartData];
    const lastCandle = updatedData[updatedData.length - 1];
    
    if (lastCandle && now - lastCandle.time < 60) {
      // Update current candle
      updatedData[updatedData.length - 1] = {
        ...lastCandle,
        high: Math.max(lastCandle.high, newCandle.close),
        low: Math.min(lastCandle.low, newCandle.close),
        close: newCandle.close,
      };
    } else {
      // Add new candle
      updatedData.push(newCandle);
    }

    setChartData(updatedData);
    candleSeriesRef.current.update(updatedData[updatedData.length - 1]);
  };

  const refreshChart = () => {
    loadChartData();
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-white">{strategy.name}</h3>
          <span className="px-2 py-1 bg-blue-900 text-blue-300 text-xs rounded">
            {strategy.symbol}
          </span>
        </div>
        
        <div className="flex items-center space-x-3">
          {strategy.lastSignal && (
            <div className="flex items-center space-x-2">
              {strategy.lastSignal.action === 'BUY' ? (
                <TrendingUp className="w-4 h-4 text-green-400" />
              ) : strategy.lastSignal.action === 'SELL' ? (
                <TrendingDown className="w-4 h-4 text-red-400" />
              ) : null}
              <span className={`text-sm font-medium ${
                strategy.lastSignal.action === 'BUY' ? 'text-green-400' :
                strategy.lastSignal.action === 'SELL' ? 'text-red-400' : 'text-gray-400'
              }`}>
                {strategy.lastSignal.action}
              </span>
            </div>
          )}
          
          <button
            onClick={refreshChart}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-10 rounded-lg">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
          </div>
        )}
        
        <div ref={chartContainerRef} className="w-full h-96 rounded-lg overflow-hidden" />
      </div>

      {/* Strategy Info */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="bg-gray-700 rounded-lg p-3">
          <span className="text-gray-400">Current Price</span>
          <p className="text-white font-medium">
            ₹{marketData?.price?.toFixed(2) || '0.00'}
          </p>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-3">
          <span className="text-gray-400">Day Change</span>
          <p className={`font-medium ${
            (marketData?.change || 0) >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {(marketData?.change || 0) >= 0 ? '+' : ''}
            {marketData?.change?.toFixed(2) || '0.00'}
          </p>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-3">
          <span className="text-gray-400">Volume</span>
          <p className="text-white font-medium">
            {marketData?.volume ? (marketData.volume / 1000).toFixed(0) + 'K' : '0'}
          </p>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-3">
          <span className="text-gray-400">Status</span>
          <p className={`font-medium ${
            strategy.enabled ? 'text-green-400' : 'text-gray-400'
          }`}>
            {strategy.enabled ? 'Active' : 'Inactive'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default StrategyChart;