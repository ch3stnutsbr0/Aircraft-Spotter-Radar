import type { NextConfig } from "next";
import { existsSync } from "node:fs";
import path from "node:path";

const repositoryEnvFile = path.resolve(process.cwd(), "../../.env.local");
if (existsSync(repositoryEnvFile)) {
  process.loadEnvFile(repositoryEnvFile);
}

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(process.cwd(), "../.."),
  },
};

export default nextConfig;
