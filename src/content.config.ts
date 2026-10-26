import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const comparisonRow = z.object({
  format: z.string(),
  strength: z.string().optional(),
  jxlAdvantage: z.string().optional(),
  fileSize: z.string().optional(),
  lossless: z.string().optional(),
  alpha: z.string().optional(),
  encodingSpeed: z.string().optional(),
});

const seo = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/seo' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    h1: z.string(),
    subheadline: z.string(),
    dropzoneLabel: z.string(),
    acceptHint: z.string(),
    keywords: z.array(z.string()).default([]),
    defaultMode: z.enum(['single', 'step-by-step', 'auto-queue']).default('single'),
    priority: z.number().default(0.8),
    comparisonTitle: z.string().default('Format comparison'),
    comparisonRows: z.array(comparisonRow),
    faqs: z.array(
      z.object({
        question: z.string(),
        answer: z.string(),
      }),
    ),
    howToSteps: z.array(z.string()).default([]),
    breadcrumbName: z.string().optional(),
  }),
});

export const collections = { seo };
