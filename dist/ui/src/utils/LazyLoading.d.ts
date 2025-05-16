/**
 * Lazy loading utilities for optimizing bundle size
 */
import { LazyExoticComponent, ComponentType } from 'react';
/**
 * Default loading component for lazy-loaded routes
 */
export declare const DefaultLoadingComponent: () => any;
/**
 * HOC to apply lazy loading with Suspense to a component
 * @param Component Component to lazy-load
 * @param LoadingComponent Optional custom loading component
 * @returns Lazy-loaded component with suspense
 */
export declare function withLazy<T>(Component: LazyExoticComponent<ComponentType<T>>, LoadingComponent?: () => any): (props: T) => any;
/**
 * Create a lazy-loaded route component
 * @param importFunc Function that imports the component
 * @param LoadingComponent Optional custom loading component
 * @returns Lazy-loaded route component
 */
export declare function lazyRoute<T>(importFunc: () => Promise<{
    default: ComponentType<T>;
}>, LoadingComponent?: () => any): (props: unknown) => any;
