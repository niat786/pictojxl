/// <reference lib="webworker" />
import { expose } from 'comlink';
import encode, { init as initEncode } from '@jsquash/jxl/encode';
import decode from '@jsquash/jxl/decode';
import type { ConvertRequest, ConvertResult, EncodeOptions } from '../lib/types';

declare const self: DedicatedWorkerGlobalScope;

const OPFS_DIR = 'jxl-outputs';

async function writeOpfs(jobId: string, buffer: ArrayBuffer): Promise<string> {
  const root = await navigator.storage.getDirectory();
  const dir = await root.getDirectoryHandle(OPFS_DIR, { create: true });
  const handle = await dir.getFileHandle(`${jobId}.jxl`, { create: true });
  const writable = await handle.createWritable();
  await writable.write(buffer);
  await writable.close();
  return `${OPFS_DIR}/${jobId}.jxl`;
}

function extensionOf(fileName: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(fileName);
  return match?.[1]?.toLowerCase() ?? '';
}

async function decodeToImageData(
  buffer: ArrayBuffer,
  mimeType: string,
  fileName: string,
): Promise<ImageData> {
  const mime = (mimeType || '').toLowerCase();
  const ext = extensionOf(fileName);
  const isJxl = mime === 'image/jxl' || ext === 'jxl';
  const isAvif = mime === 'image/avif' || ext === 'avif';
  const isWebp = mime === 'image/webp' || ext === 'webp';

  if (isJxl) {
    return decode(buffer);
  }

  // Prefer native decode via createImageBitmap for PNG/JPEG/WebP/AVIF
  try {
    const blob = new Blob([buffer], { type: mimeType || 'application/octet-stream' });
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable');
    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    bitmap.close();
    return imageData;
  } catch (nativeError) {
    // Fallback codecs for stubborn AVIF/WebP
    if (isAvif) {
      const avifDecode = (await import('@jsquash/avif/decode')).default;
      const result = await avifDecode(buffer);
      if (!result) throw new Error('AVIF decode returned empty data');
      return result as ImageData;
    }
    if (isWebp) {
      const webpDecode = (await import('@jsquash/webp/decode')).default;
      return webpDecode(buffer);
    }
    throw nativeError instanceof Error
      ? nativeError
      : new Error('Unable to decode image');
  }
}

async function imageDataToBitmap(imageData: ImageData): Promise<ImageBitmap> {
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable');
  ctx.putImageData(imageData, 0, 0);
  return createImageBitmap(canvas);
}

async function convert(request: ConvertRequest): Promise<ConvertResult> {
  await initEncode();

  const originalBytes = request.buffer.byteLength;
  const imageData = await decodeToImageData(
    request.buffer,
    request.mimeType,
    request.fileName,
  );

  const options: EncodeOptions = request.options;
  const encodeOpts = options.lossless
    ? { lossless: true as const, effort: options.effort }
    : { quality: options.quality, effort: options.effort, lossless: false as const };

  const jxlBuffer = await encode(imageData, encodeOpts);
  const opfsPath = await writeOpfs(request.jobId, jxlBuffer);

  let previewBitmap: ImageBitmap | undefined;
  let originalBitmap: ImageBitmap | undefined;

  if (request.needsPreview) {
    originalBitmap = await imageDataToBitmap(imageData);
    try {
      const previewData = await decode(jxlBuffer);
      previewBitmap = await imageDataToBitmap(previewData);
    } catch {
      // Preview decode is best-effort; encoded JXL is already stored in OPFS.
      previewBitmap = originalBitmap;
    }
  }

  return {
    jobId: request.jobId,
    opfsPath,
    originalBytes,
    jxlBytes: jxlBuffer.byteLength,
    width: imageData.width,
    height: imageData.height,
    previewBitmap,
    originalBitmap,
  };
}

async function decodeJxlPreview(buffer: ArrayBuffer): Promise<ImageBitmap> {
  const imageData = await decode(buffer);
  return imageDataToBitmap(imageData);
}

const api = {
  convert,
  decodeJxlPreview,
  ping: () => 'ok' as const,
};

export type JxlWorkerApi = typeof api;

expose(api);
