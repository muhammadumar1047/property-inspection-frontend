import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,

  typescript: {
    ignoreBuildErrors: true, // ✅ Type errors ignore
  },

  eslint: {
    ignoreDuringBuilds: true, // ✅ ESLint warnings ignore
  },
};

export default nextConfig;