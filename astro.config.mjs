// @ts-check
import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://pictojxl.com',
  integrations: [
    vue({
      appEntrypoint: '/src/pages/_app',
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ['@jsquash/jxl', '@jsquash/webp', '@jsquash/avif'],
    },
    worker: {
      format: 'es',
    },
  },
});
