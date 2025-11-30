import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  basePath:'/mcpclient/home',
  assetPrefix:'/mcpclient/home',
  env: {
    NEXT_PUBLIC_ASSET_PREFIX: "/mcpclient/home",
  },
};

export default nextConfig;
