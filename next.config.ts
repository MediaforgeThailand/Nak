import type { NextConfig } from "next";

const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "euvzhzhwlcuyrmnxvzdx.supabase.co";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Phone photos exceed the 1MB default; images are compressed client-side
      // before upload, this is headroom for slips/PDFs (Vercel caps bodies ~4.5MB).
      bodySizeLimit: "4mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHostname,
        pathname: "/storage/v1/object/sign/**",
      },
      {
        protocol: "https",
        hostname: supabaseHostname,
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
