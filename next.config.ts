import type { NextConfig } from "next";

/**
 * This project is a CLI tool that happens to live in a Next app: Tailwind and
 * the bundled fonts are wired to it, and `next build` is a useful end-to-end
 * type check. It is never deployed and never serves traffic, so there is no
 * route configuration, no image hosts, and no runtime config to set.
 */
const nextConfig: NextConfig = {};

export default nextConfig;
