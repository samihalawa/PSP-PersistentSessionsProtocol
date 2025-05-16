/**
 * Performance monitoring utilities
 */
import React from 'react';
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
/**
 * Track web vitals and performance metrics
 */
export declare function trackPerformance(): void;
/**
 * Track component render time
 * @param componentName Name of the component
 * @param startTime Start time of render
 */
export declare function trackComponentRender(componentName: string, startTime: number): void;
/**
 * Get current performance data
 * @returns Current performance metrics
 */
export declare function getPerformanceData(): PerformanceData;
/**
 * Higher-order component to track component render performance
 * @param Component Component to wrap
 * @param name Optional name for the component
 * @returns Wrapped component with performance tracking
 */
export declare function withPerformanceTracking<P extends object>(Component: React.ComponentType<P>, name?: string): React.FC<P>;
/**
 * Hook to track component render performance
 * @param componentName Name of the component
 */
export declare function usePerformanceTracking(componentName: string): void;
export {};
