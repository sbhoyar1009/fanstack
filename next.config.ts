import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  turbopack: {
    // Point to this project's root, not the parent monorepo
    root: path.resolve(__dirname),
  },
  images: {
    // Allow ESPN + ESPN CDN images unoptimized (we use unoptimized prop per image)
    remotePatterns: [
      { protocol: 'https', hostname: 'a.espncdn.com' },
      { protocol: 'https', hostname: 'a1.espncdn.com' },
      { protocol: 'https', hostname: 'a2.espncdn.com' },
      { protocol: 'https', hostname: 'a3.espncdn.com' },
      { protocol: 'https', hostname: 'a4.espncdn.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },  // Google avatars
    ],
  },
}

export default nextConfig
