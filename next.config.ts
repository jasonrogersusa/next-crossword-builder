import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const repositoryName =
  process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "next-crossword-builder";
const basePath = `/${repositoryName}`;

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  ...(isGitHubPages
    ? {
        output: "export" as const,
        basePath,
        assetPrefix: `${basePath}/`,
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
