import path from "node:path";
import type { NextConfig } from "next";

/**
 * This project is a CLI tool that happens to live in a Next app: Tailwind and
 * the bundled fonts are wired to it, and `next build` is a useful end-to-end
 * type check. It is never deployed and never serves traffic, so there is no
 * route configuration, no image hosts, and no runtime config to set.
 */
const nextConfig: NextConfig = {
  /**
   * Pin the workspace root. There is an unrelated package-lock.json in the
   * parent directory tree, and without this Next picks that as the root and
   * warns on every build.
   */
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
