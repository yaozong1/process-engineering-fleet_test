/** @type {import('next').NextConfig} */
const nextConfig = {
  // SSR 模式: 移除 static export 相关配置
  // 关闭 Strict Mode 以避免某些第三方库（Leaflet）在开发环境双挂载导致的重复初始化错误
  reactStrictMode: false,
  eslint: {
    // 临时关闭构建期 ESLint 阻塞（后续可逐步修正 any 并移除此配置）
    ignoreDuringBuilds: true,
  },

  // 图片优化配置
  images: {
    // 保留远程图片白名单; 现在使用 Next Image SSR (仍无需优化服务亦可保持 unoptimized)
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
