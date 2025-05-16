/**
 * Lazy loading utilities for optimizing bundle size
 */
import React, { Suspense, LazyExoticComponent, ComponentType } from 'react';
import { Box, CircularProgress } from '@mui/material';

/**
 * Default loading component for lazy-loaded routes
 */
export const DefaultLoadingComponent = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
    <CircularProgress />
  </Box>
);

/**
 * HOC to apply lazy loading with Suspense to a component
 * @param Component Component to lazy-load
 * @param LoadingComponent Optional custom loading component
 * @returns Lazy-loaded component with suspense
 */
export function withLazy<T>(
  Component: LazyExoticComponent<ComponentType<T>>,
  LoadingComponent = DefaultLoadingComponent
) {
  return (props: T) => (
    <Suspense fallback={<LoadingComponent />}>
      <Component {...props} />
    </Suspense>
  );
}

/**
 * Create a lazy-loaded route component
 * @param importFunc Function that imports the component
 * @param LoadingComponent Optional custom loading component
 * @returns Lazy-loaded route component
 */
export function lazyRoute<T>(
  importFunc: () => Promise<{ default: ComponentType<T> }>,
  LoadingComponent = DefaultLoadingComponent
) {
  const LazyComponent = React.lazy(importFunc);
  return withLazy(LazyComponent, LoadingComponent);
}