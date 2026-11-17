import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pg"],
  async redirects() {
    return [
      {
        source: "/dashboard/purchasing/purchase-order-approval/cmwi3qqhm000mtouvd9pebuoq",
        destination: "/dashboard/purchasing/purchase-order-approval/cmwi3qghm000mtouvd9pebuoq",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
