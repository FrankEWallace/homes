import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@homes/shared"],
  // We keep our own CLAUDE.md/AGENTS.md at the repo root — don't auto-generate here.
  agentRules: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  images: {
    // Listing media hosts. Cloudinary/S3-CDN origins are added here once the
    // upload pipeline is provisioned; Unsplash is used for seed/demo imagery.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

export default nextConfig;
