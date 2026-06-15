/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Disable browser source maps to prevent high memory usage during compiling
  productionBrowserSourceMaps: false,

  // 2. Enable smart caching for faster startup
  cacheMaxMemorySize: 50 * 1024 * 1024, // 50MB

  // 3. Optimize worker processes for faster compilation
  experimental: {
    // Disable for faster dev server startup on first run
    webpackBuildWorker: false,
  },

  // 4. Optimize Webpack concurrency for faster builds
  webpack: (config, { dev, isServer }) => {
    // Increase parallelism for faster builds
    config.parallelism = 8;
    return config;
  }
};

module.exports = nextConfig;
