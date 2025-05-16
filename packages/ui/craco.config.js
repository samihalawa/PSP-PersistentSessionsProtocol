/**
 * CRACO config for optimizing React build
 * This extends Create React App's webpack config without ejecting
 */
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const CompressionPlugin = require('compression-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Only apply optimizations in production
      if (env === 'production') {
        // Enable source maps in production for better debugging
        webpackConfig.devtool = 'source-map';
        
        // Split chunks for better caching
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          runtimeChunk: 'single',
          splitChunks: {
            chunks: 'all',
            maxInitialRequests: Infinity,
            minSize: 20000,
            maxSize: 244000,
            cacheGroups: {
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name(module) {
                  // Get the package name
                  const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
                  
                  // Group Material-UI packages together
                  if (packageName.startsWith('@mui/')) {
                    return 'npm.mui';
                  }
                  
                  // Group React packages together
                  if (packageName.startsWith('react') || packageName.startsWith('redux')) {
                    return 'npm.react';
                  }
                  
                  // Group Chart.js packages together
                  if (packageName.startsWith('chart.js') || packageName.includes('chart')) {
                    return 'npm.charts';
                  }
                  
                  // Use package name but remove special characters
                  return `npm.${packageName.replace('@', '')}`;
                },
              },
            },
          },
          // Optimize minification
          minimize: true,
          minimizer: [
            new TerserPlugin({
              terserOptions: {
                parse: {
                  ecma: 8,
                },
                compress: {
                  ecma: 5,
                  warnings: false,
                  comparisons: false,
                  inline: 2,
                  drop_console: true,
                },
                mangle: {
                  safari10: true,
                },
                output: {
                  ecma: 5,
                  comments: false,
                  ascii_only: true,
                },
              },
              parallel: true,
              extractComments: false,
            }),
          ],
        };
        
        // Add bundle analyzer in report mode if requested
        if (process.env.ANALYZE) {
          webpackConfig.plugins.push(
            new BundleAnalyzerPlugin({
              analyzerMode: 'static',
              reportFilename: 'bundle-report.html',
            })
          );
        }
        
        // Add compression plugin for gzip assets
        webpackConfig.plugins.push(
          new CompressionPlugin({
            algorithm: 'gzip',
            test: /\.(js|css|html|svg)$/,
            threshold: 10240, // Only compress files > 10kb
            minRatio: 0.8, // Only compress files that compress well
          })
        );
      }
      
      return webpackConfig;
    },
  },
  
  // Add babel plugin for selective component imports
  babel: {
    plugins: [
      [
        'babel-plugin-import',
        {
          libraryName: '@mui/material',
          libraryDirectory: '',
          camel2DashComponentName: false,
        },
        'core',
      ],
      [
        'babel-plugin-import',
        {
          libraryName: '@mui/icons-material',
          libraryDirectory: '',
          camel2DashComponentName: false,
        },
        'icons',
      ],
    ],
  },
  
  // Optimize Jest testing
  jest: {
    configure: {
      moduleNameMapper: {
        '^src/(.*)$': '<rootDir>/src/$1',
      },
      transformIgnorePatterns: [
        'node_modules/(?!(@mui|chart.js)/)',
      ],
    },
  },
};