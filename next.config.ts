import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "dev.habitville.co.uk",
    "dev2.habitville.co.uk",
  ],
  devIndicators: false,
};

export default nextConfig;
