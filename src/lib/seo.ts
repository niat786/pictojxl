const SITE = 'https://pictojxl.com';

export function absoluteUrl(path = '/'): string {
  if (!path || path === '/') return `${SITE}/`;
  return `${SITE}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildWebApplicationLd(opts: {
  name: string;
  description: string;
  url: string;
  featureList?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: opts.name,
    alternateName: 'pictojxl.com',
    url: opts.url,
    applicationCategory: 'MultimediaApplication',
    applicationSubCategory: 'DeveloperApplication',
    operatingSystem: 'All',
    browserRequirements: 'Requires HTML5 and WebAssembly',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: opts.description,
    featureList: opts.featureList ?? [
      'On-device JPEG XL encode and decode',
      'PNG, JPG, WebP, and AVIF inputs',
      'Side-by-side quality inspector',
      'Queue mode with ZIP download',
      'No image uploads to the server',
    ],
  };
}

export function buildFaqLd(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };
}

export function buildHowToLd(opts: {
  name: string;
  description: string;
  steps: string[];
  url: string;
}) {
  if (!opts.steps.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    step: opts.steps.map((text, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: `Step ${i + 1}`,
      text,
    })),
  };
}

export function buildBreadcrumbLd(
  crumbs: { name: string; path: string }[],
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export { SITE };
