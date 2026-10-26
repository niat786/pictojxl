export interface BatchRisk {
  level: 'ok' | 'warn' | 'block';
  title: string;
  message: string;
  fileCount: number;
  totalBytes: number;
  heaviestBytes: number;
}

function deviceMemoryGb(): number {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return typeof nav.deviceMemory === 'number' && nav.deviceMemory > 0
    ? nav.deviceMemory
    : 4;
}

/** Soft/hard caps scaled by reported device memory (fallback 4GB). */
export function getBatchLimits() {
  const gb = deviceMemoryGb();
  return {
    deviceGb: gb,
    maxFilesWarn: Math.min(200, Math.max(40, Math.floor(gb * 40))),
    maxFilesBlock: Math.min(400, Math.max(80, Math.floor(gb * 80))),
    maxTotalWarn: Math.min(800, Math.max(200, gb * 120)) * 1024 * 1024,
    maxTotalBlock: Math.min(1600, Math.max(400, gb * 250)) * 1024 * 1024,
    maxSingleWarn: Math.min(80, Math.max(25, gb * 20)) * 1024 * 1024,
    maxSingleBlock: Math.min(200, Math.max(60, gb * 45)) * 1024 * 1024,
  };
}

export function assessBatchRisk(
  incoming: File[],
  alreadyQueuedBytes = 0,
  alreadyQueuedCount = 0,
): BatchRisk {
  const limits = getBatchLimits();
  const fileCount = incoming.length + alreadyQueuedCount;
  const heaviestBytes = incoming.reduce((m, f) => Math.max(m, f.size), 0);
  const incomingBytes = incoming.reduce((s, f) => s + f.size, 0);
  const totalBytes = incomingBytes + alreadyQueuedBytes;

  const base = {
    fileCount,
    totalBytes,
    heaviestBytes,
  };

  if (
    fileCount > limits.maxFilesBlock ||
    totalBytes > limits.maxTotalBlock ||
    heaviestBytes > limits.maxSingleBlock
  ) {
    return {
      ...base,
      level: 'block',
      title: 'Batch too large for this device',
      message: [
        `This upload looks likely to exhaust available memory (~${limits.deviceGb} GB reported).`,
        fileCount > limits.maxFilesBlock
          ? `File count ${fileCount} exceeds the safe limit of ${limits.maxFilesBlock}.`
          : null,
        heaviestBytes > limits.maxSingleBlock
          ? `A single file is ${formatMb(heaviestBytes)} (limit ${formatMb(limits.maxSingleBlock)}).`
          : null,
        totalBytes > limits.maxTotalBlock
          ? `Total size ${formatMb(totalBytes)} exceeds ${formatMb(limits.maxTotalBlock)}.`
          : null,
        'Please remove some images or convert in smaller batches.',
      ]
        .filter(Boolean)
        .join(' '),
    };
  }

  if (
    fileCount > limits.maxFilesWarn ||
    totalBytes > limits.maxTotalWarn ||
    heaviestBytes > limits.maxSingleWarn
  ) {
    return {
      ...base,
      level: 'warn',
      title: 'Large batch may strain memory',
      message: [
        `You're adding a heavy set of images (${fileCount} files, ${formatMb(totalBytes)} total).`,
        'Encoding large or numerous images in the browser can freeze the tab or run out of memory.',
        'Continue only if your device has free RAM, or cancel and upload a smaller batch.',
      ].join(' '),
    };
  }

  return {
    ...base,
    level: 'ok',
    title: '',
    message: '',
  };
}

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isMemoryError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /memory|out of memory|allocation failed|array buffer|oom|wasm/i.test(msg);
}
