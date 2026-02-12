import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@pdp/backend"],
  typedRoutes: true,
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
