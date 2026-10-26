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

## Cloudflare (Workers static assets)

Astro builds static files into `./dist`. Wrangler uploads that folder as an assets-only Worker (`[assets]` in `wrangler.toml`).

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |

```bash
npm run deploy
```

Site URL: `https://pictojxl.com`
