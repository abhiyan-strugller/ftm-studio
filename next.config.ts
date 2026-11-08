import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Satori/next-og needs the fonts bundled as files we read at runtime.
  outputFileTracingIncludes: {
    "/api/render": ["./public/fonts/**/*"],
  },
  images: {
    remotePatterns: [
      // Rendered post PNGs live in the public Supabase Storage bucket.
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default nextConfig;
