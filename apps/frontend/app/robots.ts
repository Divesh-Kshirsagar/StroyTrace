import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/editor/', '/dashboard/'],
    },
    sitemap: 'https://clarity.com/sitemap.xml',
  };
}
