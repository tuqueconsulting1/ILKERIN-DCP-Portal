import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Default is 1mb, too small for a scanned CBK letter/PDF attachment.
    // Set with headroom above MAX_ATTACHMENT_BYTES (lib/attachments.ts) so
    // that constant's friendly error fires before this hard framework cutoff.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
