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
    const calendarApp = process.env.CALENDAR_APP_URL || "https://alic-calendar.vercel.app";
    return [
      // Auth routes - proxy to Calendar app
      {
        source: "/auth",
        destination: `${calendarApp}/auth`,
      },
      {
        source: "/forgot-password",
        destination: `${calendarApp}/forgot-password`,
      },
      {
        source: "/reset-password",
        destination: `${calendarApp}/reset-password`,
      },
      // Calendar routes
      {
        source: "/dashboard",
        destination: `${calendarApp}/dashboard`,
      },
      {
        source: "/dashboard/:path*",
        destination: `${calendarApp}/dashboard/:path*`,
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
        source: "/event-reviews",
        destination: `${calendarApp}/event-reviews`,
      },
      {
        source: "/event-reviews/:path*",
        destination: `${calendarApp}/event-reviews/:path*`,
      },
      {
        source: "/users",
        destination: `${calendarApp}/users`,
      },
      {
        source: "/users/:path*",
        destination: `${calendarApp}/users/:path*`,
      },
      {
        source: "/rooms",
        destination: `${calendarApp}/rooms`,
      },
      {
        source: "/rooms/:path*",
        destination: `${calendarApp}/rooms/:path*`,
      },
      {
        source: "/budget",
        destination: `${calendarApp}/budget`,
      },
      {
        source: "/budget/:path*",
        destination: `${calendarApp}/budget/:path*`,
      },
      {
        source: "/members",
        destination: `${calendarApp}/members`,
      },
      {
        source: "/members/:path*",
        destination: `${calendarApp}/members/:path*`,
      },
      {
        source: "/public",
        destination: `${calendarApp}/public`,
      },
      {
        source: "/public/:path*",
        destination: `${calendarApp}/public/:path*`,
      },
      {
        source: "/assets/:path*",
        destination: `${calendarApp}/assets/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
