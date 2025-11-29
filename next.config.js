/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  async rewrites() {
    const calendarApp = process.env.ROUTE_CALENDAR_APP;
    return [
      {
        source: "/auth",
        destination: `${calendarApp}/auth`,
      },
      {
        source: "/auth/:path*",
        destination: `${calendarApp}/auth/:path*`,
      },
      {
        source: "/calendar",
        destination: `${calendarApp}/calendar`,
      },
      {
        source: "/calendar/:path*",
        destination: `${calendarApp}/calendar/:path*`,
      },
      {
        source: "/dashboard",
        destination: `${calendarApp}/dashboard`,
      },
      {
        source: "/dashboard/:path*",
        destination: `${calendarApp}/dashboard/:path*`,
      },
      {
        source: "/public",
        destination: `${calendarApp}/public`,
      },
      {
        source: "/public/:path*",
        destination: `${calendarApp}/public/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
