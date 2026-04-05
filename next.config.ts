import type { NextConfig } from "next";

// ⚠️ Change this to match your GitHub repo name!
// e.g. if repo is "github.com/user/pomodoro-timer", set: "/pomodoro-timer"
// Set to "" if deploying to a custom domain (root)
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
