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
  webpack: (config, { isServer }) => {
    config.cache = false;
    if (!isServer) {
        config.devtool = false;
    }
    return config;
  }
};

module.exports = nextConfig;
