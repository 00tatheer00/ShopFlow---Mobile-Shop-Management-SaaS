import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://shopflow.pk';
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/shop-suspended', '/unauthorized'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
