/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Ensure trailing slashes are handled correctly for static hosting
  trailingSlash: true,
};

export default nextConfig;
