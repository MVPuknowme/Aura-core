import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: "standalone",
  serverExternalPackages: ["zlib-sync"],
};

export default nextConfig;
