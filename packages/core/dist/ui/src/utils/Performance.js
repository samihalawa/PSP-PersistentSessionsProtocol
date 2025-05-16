"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackPerformance = trackPerformance;
exports.trackComponentRender = trackComponentRender;
exports.getPerformanceData = getPerformanceData;
exports.withPerformanceTracking = withPerformanceTracking;
exports.usePerformanceTracking = usePerformanceTracking;
/**
 * Performance monitoring utilities
 */
const react_1 = __importStar(require("react"));
// Global storage for performance metrics
let performanceData = {
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
function trackPerformance() {
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
        const metric = entry;
        if (metric.name === 'first-paint') {
            performanceData.firstPaint = metric.startTime;
        }
        else if (metric.name === 'first-contentful-paint') {
            performanceData.firstContentfulPaint = metric.startTime;
        }
    });
    // Memory usage if available
    if (window.performance.memory) {
        performanceData.memoryUsage = window.performance.memory.usedJSHeapSize;
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
        }
        catch (e) {
            console.warn('LCP measurement not supported', e);
        }
        // FID observer
        try {
            const fidObserver = new PerformanceObserver(list => {
                list.getEntries().forEach(entry => {
                    const fidEntry = entry;
                    performanceData.firstInputDelay = fidEntry.processingStart - fidEntry.startTime;
                });
            });
            fidObserver.observe({ type: 'first-input', buffered: true });
        }
        catch (e) {
            console.warn('FID measurement not supported', e);
        }
        // CLS observer
        try {
            let clsValue = 0;
            const clsObserver = new PerformanceObserver(list => {
                list.getEntries().forEach(entry => {
                    const clsEntry = entry;
                    if (!clsEntry.hadRecentInput) {
                        clsValue += clsEntry.value;
                        performanceData.cumulativeLayoutShift = clsValue;
                    }
                });
            });
            clsObserver.observe({ type: 'layout-shift', buffered: true });
        }
        catch (e) {
            console.warn('CLS measurement not supported', e);
        }
    }
}
/**
 * Track component render time
 * @param componentName Name of the component
 * @param startTime Start time of render
 */
function trackComponentRender(componentName, startTime) {
    const renderTime = performance.now() - startTime;
    performanceData.componentRenderTime[componentName] = renderTime;
}
/**
 * Get current performance data
 * @returns Current performance metrics
 */
function getPerformanceData() {
    return { ...performanceData };
}
/**
 * Higher-order component to track component render performance
 * @param Component Component to wrap
 * @param name Optional name for the component
 * @returns Wrapped component with performance tracking
 */
function withPerformanceTracking(Component, name) {
    const componentName = name || Component.displayName || Component.name || 'Unknown';
    const PerformanceTrackedComponent = (props) => {
        const startTime = performance.now();
        (0, react_1.useEffect)(() => {
            trackComponentRender(componentName, startTime);
        }, []);
        return <Component {...props}/>;
    };
    PerformanceTrackedComponent.displayName = `PerformanceTracked(${componentName})`;
    return PerformanceTrackedComponent;
}
/**
 * Hook to track component render performance
 * @param componentName Name of the component
 */
function usePerformanceTracking(componentName) {
    (0, react_1.useEffect)(() => {
        const startTime = performance.now();
        return () => {
            trackComponentRender(componentName, startTime);
        };
    }, [componentName]);
}
