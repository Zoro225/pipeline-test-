import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Allow the dev server's JS/HMR assets to load when the app is opened
  // from a LAN IP instead of localhost (see README troubleshooting section).
  allowedDevOrigins: ["192.168.0.101"],
};

export default nextConfig;
