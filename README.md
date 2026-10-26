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

Site URL: `https://pictojxl.com`
