/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker optimization
  output: 'standalone',

  // Transpile MUI packages for Next.js 15 compatibility
  transpilePackages: [
    '@mui/material',
    '@mui/system',
    '@mui/icons-material',
    '@mui/lab',
    '@mui/base',
    '@mui/x-date-pickers',
    '@emotion/react',
    '@emotion/styled',
    '@emotion/cache'
  ],

  // Note: modularizeImports is not needed with optimizePackageImports in Next.js 15
  // The optimizePackageImports experimental feature handles this automatically

  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
        pathname: '**'
      }
    ]
  },

  // Optimize bundling for MUI and Emotion
  experimental: {
    optimizePackageImports: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled']
  },

  webpack: (config, { isServer }) => {
    // Fix MUI/emotion module resolution for both client and server
    config.resolve.alias = {
      ...config.resolve.alias,
      '@emotion/react': require.resolve('@emotion/react'),
      '@emotion/styled': require.resolve('@emotion/styled'),
      '@emotion/cache': require.resolve('@emotion/cache'),
      '@mui/styled-engine': require.resolve('@mui/styled-engine')
    };

    return config;
  }
};

module.exports = nextConfig;
