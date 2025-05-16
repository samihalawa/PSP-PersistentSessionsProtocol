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
exports.DefaultLoadingComponent = void 0;
exports.withLazy = withLazy;
exports.lazyRoute = lazyRoute;
/**
 * Lazy loading utilities for optimizing bundle size
 */
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
/**
 * Default loading component for lazy-loaded routes
 */
const DefaultLoadingComponent = () => (<material_1.Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
    <material_1.CircularProgress />
  </material_1.Box>);
exports.DefaultLoadingComponent = DefaultLoadingComponent;
/**
 * HOC to apply lazy loading with Suspense to a component
 * @param Component Component to lazy-load
 * @param LoadingComponent Optional custom loading component
 * @returns Lazy-loaded component with suspense
 */
function withLazy(Component, LoadingComponent = exports.DefaultLoadingComponent) {
    return (props) => (<react_1.Suspense fallback={<LoadingComponent />}>
      <Component {...props}/>
    </react_1.Suspense>);
}
/**
 * Create a lazy-loaded route component
 * @param importFunc Function that imports the component
 * @param LoadingComponent Optional custom loading component
 * @returns Lazy-loaded route component
 */
function lazyRoute(importFunc, LoadingComponent = exports.DefaultLoadingComponent) {
    const LazyComponent = react_1.default.lazy(importFunc);
    return withLazy(LazyComponent, LoadingComponent);
}
