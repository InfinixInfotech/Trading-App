import React, { useEffect, useRef } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  LineData,
  UTCTimestamp,
  CandlestickSeriesOptions,
  LineSeriesOptions,
  SeriesType
} from 'lightweight-charts';
import type { Candle } from '../utils/candleUtils';

type Props = { candles: Candle[] };

// Helper: Calculate N-period Simple Moving Average
function getSMA(
  candles: Candle[],
  period: number
): { time: UTCTimestamp; value?: number }[] {
  return candles.map((c, i) => {
    if (i < period - 1) {
      return { time: c.time as UTCTimestamp };
    }
    const slice = candles.slice(i - period + 1, i + 1);
    const sum = slice.reduce((acc, c) => acc + c.close, 0);
    return { 
      time: c.time as UTCTimestamp, 
      value: +(sum / period).toFixed(2) 
    };
  });
}

const CandleChart: React.FC<Props> = ({ candles }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const maBlueRef = useRef<ISeriesApi<'Line'> | null>(null);
  const maGreenRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Initialize chart
    chartRef.current = createChart(chartContainerRef.current, {
      height: 500,
      width: 620,
      layout: { 
        //background: { color: '#181818' },
        textColor: '#d9d9d9'
      },
      grid: { 
        vertLines: { color: '#2B2B43' }, 
        horzLines: { color: '#2B2B43' } 
      },
      timeScale: { 
        timeVisible: true, 
        secondsVisible: false,
        borderColor: '#485c7b',
      },
     
    });

    // Add candlestick series
    candleSeriesRef.current = chartRef.current.addCandlestickSeries({
      upColor: '#4bffb5',
      downColor: '#ff4976',
      borderDownColor: '#ff4976',
      borderUpColor: '#4bffb5',
      wickDownColor: '#ff4976',
      wickUpColor: '#4bffb5',
    });

    // Add moving average series
    maBlueRef.current = chartRef.current.addLineSeries({
      color: '#2962FF',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      title: 'MA(9)',
    });

    maGreenRef.current = chartRef.current.addLineSeries({
      color: '#4caf50',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      title: 'MA(21)',
    });

    return () => {
      chartRef.current?.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      maBlueRef.current = null;
      maGreenRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current || !maBlueRef.current || !maGreenRef.current) return;

    // Set candle data
    candleSeriesRef.current.setData(
      candles.map(c => ({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close
      }))
    );

    // Set moving averages
    const maBlue = getSMA(candles, 9).filter(d => d.value !== undefined) as LineData[];
    const maGreen = getSMA(candles, 21).filter(d => d.value !== undefined) as LineData[];
    
    maBlueRef.current.setData(maBlue);
    maGreenRef.current.setData(maGreen);

    // Auto-scale the time scale to fit the data
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  return <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />;
};

export default CandleChart;