/**
 * Performance monitoring utilities
 */
import React, { useEffect, useState } from 'react';

// Interface for captured performance data
interface PerformanceData {
  timeToFirstByte: number;
  domContentLoaded: number;
  windowLoaded: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  cumulativeLayoutShift?: number;
  memoryUsage?: number;
  componentRenderTime: Record<string, number>;
}

// Global storage for performance metrics
let performanceData: PerformanceData = {
  timeToFirstByte: 0,
  domContentLoaded: 0,
  windowLoaded: 0,
  firstPaint: 0,
  firstContentfulPaint: 0,
  componentRenderTime: {}
};

/**
 * Track web vitals and performance metrics
 */
export function trackPerformance() {
  if (typeof window === 'undefined' || !window.performance) {
    return;
  }

  // Navigation timing metrics
  const navTiming = window.performance.timing;
  performanceData.timeToFirstByte = navTiming.responseStart - navTiming.requestStart;
  performanceData.domContentLoaded = navTiming.domContentLoadedEventEnd - navTiming.navigationStart;
  performanceData.windowLoaded = navTiming.loadEventEnd - navTiming.navigationStart;

  // Paint timing metrics
  const paintMetrics = window.performance.getEntriesByType('paint');
  paintMetrics.forEach(entry => {
    const metric = entry as PerformanceEntry;
    if (metric.name === 'first-paint') {
      performanceData.firstPaint = metric.startTime;
    } else if (metric.name === 'first-contentful-paint') {
      performanceData.firstContentfulPaint = metric.startTime;
    }
  });

  // Memory usage if available
  if ((window.performance as any).memory) {
    performanceData.memoryUsage = (window.performance as any).memory.usedJSHeapSize;
  }

  // Listen for Largest Contentful Paint
  if ('PerformanceObserver' in window) {
    // LCP observer
    try {
      const lcpObserver = new PerformanceObserver(list => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        performanceData.largestContentfulPaint = lastEntry.startTime;
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      console.warn('LCP measurement not supported', e);
    }
    
    // FID observer
    try {
      const fidObserver = new PerformanceObserver(list => {
        list.getEntries().forEach(entry => {
          const fidEntry = entry as any;
          performanceData.firstInputDelay = fidEntry.processingStart - fidEntry.startTime;
        });
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      console.warn('FID measurement not supported', e);
    }
    
    // CLS observer
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver(list => {
        list.getEntries().forEach(entry => {
          const clsEntry = entry as any;
          if (!clsEntry.hadRecentInput) {
            clsValue += clsEntry.value;
            performanceData.cumulativeLayoutShift = clsValue;
          }
        });
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      console.warn('CLS measurement not supported', e);
    }
  }
}

/**
 * Track component render time
 * @param componentName Name of the component
 * @param startTime Start time of render
 */
export function trackComponentRender(componentName: string, startTime: number) {
  const renderTime = performance.now() - startTime;
  performanceData.componentRenderTime[componentName] = renderTime;
}

/**
 * Get current performance data
 * @returns Current performance metrics
 */
export function getPerformanceData(): PerformanceData {
  return { ...performanceData };
}

/**
 * Higher-order component to track component render performance
 * @param Component Component to wrap
 * @param name Optional name for the component
 * @returns Wrapped component with performance tracking
 */
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  name?: string
): React.FC<P> {
  const componentName = name || Component.displayName || Component.name || 'Unknown';
  
  const PerformanceTrackedComponent: React.FC<P> = (props) => {
    const startTime = performance.now();
    
    useEffect(() => {
      trackComponentRender(componentName, startTime);
    }, []);
    
    return <Component {...props} />;
  };
  
  PerformanceTrackedComponent.displayName = `PerformanceTracked(${componentName})`;
  
  return PerformanceTrackedComponent;
}

/**
 * Hook to track component render performance
 * @param componentName Name of the component
 */
export function usePerformanceTracking(componentName: string) {
  useEffect(() => {
    const startTime = performance.now();
    return () => {
      trackComponentRender(componentName, startTime);
    };
  }, [componentName]);
}