/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static export for deployment
  output: 'export',
  trailingSlash: true,
  skipTrailingSlashRedirect: true,

  // 图片优化配置
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'source.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'ext.same-assets.com',
      },
      {
        protocol: 'https',
        hostname: 'ugc.same-assets.com',
      },
      {
        protocol: 'https',
        hostname: 'cdnjs.cloudflare.com',
      }
    ],
  },

  // 编译配置
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // 压缩配置
  compress: true,

  // 性能配置
  poweredByHeader: false,
  generateEtags: false,

  // Webpack configuration for Leaflet
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'leaflet'];
    }
    return config;
  },
};

module.exports = nextConfig;
