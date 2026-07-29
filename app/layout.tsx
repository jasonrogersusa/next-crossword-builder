import type { Metadata } from "next";
import "./globals.css";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const repositoryName =
  process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "next-crossword-builder";
const basePath = isGitHubPages ? `/${repositoryName}` : "";
const faviconPath = `${basePath}/favicon.svg`;

export const metadata: Metadata = {
  title: "Neural Mini — Personalized AI Crossword",
  description:
    "Choose your AI interests and generate a personalized, playable mini crossword.",
  icons: {
    icon: faviconPath,
    shortcut: faviconPath,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
