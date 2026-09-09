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
  // Forces Next.js to regenerate chunks and ignore potentially corrupted cached modules
  // Timestamp update: 2024-05-24T14:30:00Z
  generateBuildId: async () => {
    return `stable-build-${Date.now()}`;
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
        config.devtool = false;
    }
    return config;
  }
};

module.exports = nextConfig;
