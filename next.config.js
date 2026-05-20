/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Disable browser source maps to prevent high memory usage during compiling
  productionBrowserSourceMaps: false,

  // 2. Disable in-memory page/route caching to keep RAM footprint low
  cacheMaxMemorySize: 0,

  // 3. Limit parallel worker processes that consume massive RAM
  experimental: {
    // Disable parallel build workers (prevents spawning extra memory-heavy processes)
    webpackBuildWorker: false,
    // Disable extra compile worker threads
    workerThreads: false,
  },

  // 4. Restrict Webpack concurrency to lower peak heap usage
  webpack: (config, { dev, isServer }) => {
    // Limit parallel compilation tasks (default is 100) to keep memory footprint flat
    config.parallelism = 4;
    return config;
  }
};

module.exports = nextConfig;
