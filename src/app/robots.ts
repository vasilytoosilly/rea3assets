import type { MetadataRoute } from "next";

/**
 * robots.txt for rea3assets.
 *
 * In production all admin UI and API routes are auth-gated via the edge
 * proxy middleware, so disallow everything. The health endpoint and future
 * marketplace pages can be selectively allowed later.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
 */
export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/health",
      disallow: "/",
    },
    sitemap: "https://assets.rea3.studio/sitemap.xml",
  };
}
