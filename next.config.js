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
  generateBuildId: async () => {
    // Forces Next.js to regenerate chunks and ignore potentially corrupted cached modules
    return `build-${Date.now()}`;
  },
  webpack: (config, { isServer }) => {
    config.cache = false;
    if (!isServer) {
        config.devtool = false;
    }
    return config;
  }
};

module.exports = nextConfig;