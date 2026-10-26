/**
 * @deprecated Prefer Astro content collection `src/content/seo/*.md`.
 * Kept as a thin re-export helper for any legacy imports.
 */
import { getCollection } from 'astro:content';

export async function getAllSlugs(): Promise<string[]> {
  const entries = await getCollection('seo');
  return entries.filter((e) => e.id !== 'home').map((e) => e.id);
}
