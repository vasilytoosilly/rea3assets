/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Mount under erp.rea3.studio/assets/*
  basePath: '/assets',

  // Asset serving from /assets prefix
  assetPrefix: '/assets',

  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;
