/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Increase payload size limit if needed for server actions or api routes
  experimental: {
    serverActions: {
      bodySizeLimit: '6mb'
    }
  }
};

module.exports = nextConfig;
