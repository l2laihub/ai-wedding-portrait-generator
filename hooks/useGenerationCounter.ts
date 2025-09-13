import { useState, useEffect } from 'react';
import { counterService, CounterMetrics } from '../services/counterService';

export interface UseGenerationCounterReturn {
  totalGenerations: number;
  dailyGenerations: number;
  formattedCounter: string;
  metrics: CounterMetrics;
  statistics: ReturnType<typeof counterService.getStatistics>;
}

/**
 * React hook for accessing generation counter data
 * Automatically subscribes to counter updates for reactive UI
 */
export function useGenerationCounter(): UseGenerationCounterReturn {
  const [metrics, setMetrics] = useState<CounterMetrics>(counterService.getMetrics());
  const [statistics, setStatistics] = useState(counterService.getStatistics());

  useEffect(() => {
    // Subscribe to counter updates
    const unsubscribe = counterService.subscribe((newMetrics) => {
      setMetrics(newMetrics);
      setStatistics(counterService.getStatistics());
    });

    // Get initial values
    setMetrics(counterService.getMetrics());
    setStatistics(counterService.getStatistics());

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  return {
    totalGenerations: metrics.totalGenerations,
    dailyGenerations: metrics.dailyGenerations,
    formattedCounter: counterService.getFormattedCounter(),
    metrics,
    statistics,
  };
}

/**
 * Hook for just the formatted counter text (lightweight version)
 */
export function useFormattedCounter(): string {
  const [formattedCounter, setFormattedCounter] = useState(counterService.getFormattedCounter());

  useEffect(() => {
    const unsubscribe = counterService.subscribe(() => {
      setFormattedCounter(counterService.getFormattedCounter());
    });

    // Get initial value
    setFormattedCounter(counterService.getFormattedCounter());

    return unsubscribe;
  }, []);

  return formattedCounter;
}