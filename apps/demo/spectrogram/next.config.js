/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@audacity-ui/components', '@audacity-ui/core', '@audacity-ui/tokens'],
  outputFileTracingRoot: require('path').join(__dirname, '../../..'),
}

module.exports = nextConfig
