import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Set the correct workspace root to avoid lockfile detection issues
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
