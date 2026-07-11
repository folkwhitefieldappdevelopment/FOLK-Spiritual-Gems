/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    workerThreads: false,
    cpus: 1
  },
  // Forces Next.js to regenerate chunks and ignore potentially corrupted cached modules
  // Timestamp update: 2024-05-20T12:00:00Z
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
  webpack: (config, { isServer }) => {
    // Disable webpack caching to resolve module/chunk loading inconsistencies in the dev environment
    config.cache = false;
    if (!isServer) {
        config.devtool = false;
    }
    return config;
  }
};

module.exports = nextConfig;