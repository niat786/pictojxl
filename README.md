# pictojxl.com — PictoJXL

Client-side JPEG XL converter built with **Astro 5 + Vue 3 islands**, WebAssembly (`@jsquash/jxl`), OPFS, and a Squoosh-style split inspector.

## Features

- Single / step-by-step / bulk queue modes
- Multi-worker Wasm pool (AdSense-safe; no `COEP: require-corp`)
- Zero-CLS AdSense slot skeletons
- Programmatic SEO pages (`/png-to-jxl`, `/jpg-to-jxl`, …)

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Cloudflare Pages

This is a **Pages** project (static `dist/`), not a Worker.

| Setting | Value |
| --- | --- |
| Framework | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Deploy command | leave empty (Git integration) **or** `npx wrangler pages deploy` |

Do **not** use `wrangler deploy` — that expects a Worker entrypoint and fails with “Missing entry-point”.

```bash
npm run deploy
```

Site URL: `https://pictojxl.com`
