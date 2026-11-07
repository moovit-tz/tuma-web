import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (see Dockerfile).
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ["bwip-js", "sharp"],
  // One portal: the former Console and Partner areas now live under /portal.
  async redirects() {
    return [
      { source: "/:locale(en|sw|fr)/console", destination: "/:locale/portal", permanent: true },
      { source: "/:locale(en|sw|fr)/console/:path*", destination: "/:locale/portal/:path*", permanent: true },
      { source: "/:locale(en|sw|fr)/partner", destination: "/:locale/portal", permanent: true },
      { source: "/:locale(en|sw|fr)/partner/cargo/:waybill", destination: "/:locale/portal/shipments/:waybill", permanent: true },
      { source: "/:locale(en|sw|fr)/partner/:path*", destination: "/:locale/portal/:path*", permanent: true },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
