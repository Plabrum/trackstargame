import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Set the correct workspace root to avoid lockfile detection issues
  outputFileTracingRoot: path.join(__dirname),

  // Allow localhost and 127.0.0.1 in development
  allowedDevOrigins: ['localhost:3000', '127.0.0.1:3000'],
};

export default nextConfig;
