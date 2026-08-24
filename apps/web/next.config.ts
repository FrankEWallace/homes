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
    // Supabase Storage / S3-compatible origins are added here once provisioned.
    // Kept behind our storage adapter so the host can change without touching UI.
    remotePatterns: [
      // { protocol: "https", hostname: "<project>.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default nextConfig;
