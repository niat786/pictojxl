import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const site = 'https://pictojxl.com';

const legalPaths: { path: string; priority: string; changefreq: string }[] = [
  { path: '/about', priority: '0.5', changefreq: 'monthly' },
  { path: '/contact', priority: '0.5', changefreq: 'monthly' },
  { path: '/privacy-policy', priority: '0.4', changefreq: 'monthly' },
  { path: '/terms-of-service', priority: '0.4', changefreq: 'monthly' },
  { path: '/cookie-policy', priority: '0.4', changefreq: 'monthly' },
];

export const GET: APIRoute = async () => {
  const entries = await getCollection('seo');
  const sorted = [...entries].sort(
    (a, b) => (b.data.priority ?? 0.5) - (a.data.priority ?? 0.5),
  );

  const lastmod = new Date().toISOString().slice(0, 10);

  const seoUrls = sorted.map((entry) => {
    const path = entry.id === 'home' ? '/' : `/${entry.id}`;
    const loc = `${site}${path === '/' ? '/' : path}`;
    const priority = (entry.data.priority ?? 0.8).toFixed(1);
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
  });

  const legalUrls = legalPaths.map(
    (item) => `  <url>
    <loc>${site}${item.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`,
  );

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...seoUrls, ...legalUrls].join('\n')}
</urlset>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
