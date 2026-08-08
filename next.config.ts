import type { NextConfig } from "next";

const LEGACY_SITE = "https://kindling-network.web.app";

const nextConfig: NextConfig = {
  // The legacy static site still hosts the form filler and its admin page.
  // These paths predate the portal, so send them to where they actually live.
  // Redirects run before proxy (see proxy.ts), so the auth gate never sees them.
  async redirects() {
    return [
      {
        source: "/forms",
        destination: `${LEGACY_SITE}/forms/`,
        permanent: false,
      },
      {
        source: "/forms/:path*",
        destination: `${LEGACY_SITE}/forms/:path*`,
        permanent: false,
      },
      {
        source: "/admin-forms.html",
        destination: `${LEGACY_SITE}/admin-forms.html`,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
