import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
import PQueue from 'p-queue';
import { zipSync } from 'fflate';
import type { EncodeOptions, QueueItem, StudioMode } from '../lib/types';
import { clearOpfsOutputs, deleteOpfsFile, readOpfsBuffer } from '../lib/opfs';
import { createWorkerPool, RoundRobinPool } from '../lib/workerPool';
import {
  assessBatchRisk,
  isMemoryError,
  type BatchRisk,
} from '../lib/memoryLimits';

function uid(): string {
  return crypto.randomUUID();
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const useConverterStore = defineStore('converter', () => {
  const mode = ref<StudioMode>('single');
  const items = ref<QueueItem[]>([]);
  const activeId = ref<string | null>(null);
  const options = ref<EncodeOptions>({
    quality: 75,
    effort: 7,
    lossless: false,
  });
  const isPaused = ref(false);
  const isBusy = ref(false);
  const originalBitmap = shallowRef<ImageBitmap | null>(null);
  const previewBitmap = shallowRef<ImageBitmap | null>(null);
  const lastError = ref<string | null>(null);
  const memoryWarning = ref<BatchRisk | null>(null);
  let pendingFiles: File[] | null = null;

  let pool: RoundRobinPool | null = null;
  let queue: PQueue | null = null;

  function ensureEngine() {
    if (!pool) {
      pool = new RoundRobinPool(createWorkerPool());
    }
    if (!queue) {
      const concurrency = Math.min(3, pool.size);
      queue = new PQueue({ concurrency });
    }
    return { pool, queue };
  }

  const activeItem = computed(() => items.value.find((i) => i.id === activeId.value) ?? null);
  const doneCount = computed(() => items.value.filter((i) => i.status === 'done').length);
  const totalSavings = computed(() => {
    const done = items.value.filter((i) => i.status === 'done' && i.jxlBytes != null);
    if (!done.length) return null;
    const original = done.reduce((s, i) => s + i.originalBytes, 0);
    const jxl = done.reduce((s, i) => s + (i.jxlBytes ?? 0), 0);
    return {
      original,
      jxl,
      pct: original > 0 ? Math.round(((original - jxl) / original) * 100) : 0,
      originalLabel: formatBytes(original),
      jxlLabel: formatBytes(jxl),
    };
  });

  function revokeThumbnails() {
    for (const item of items.value) {
      if (item.thumbnailUrl) URL.revokeObjectURL(item.thumbnailUrl);
    }
  }

  function closeBitmaps() {
    originalBitmap.value?.close();
    previewBitmap.value?.close();
    originalBitmap.value = null;
    previewBitmap.value = null;
  }

  function setMode(next: StudioMode) {
    mode.value = next;
  }

  function setOptions( partial: Partial<EncodeOptions>) {
    options.value = { ...options.value, ...partial };
  }

  async function addFiles(files: FileList | File[], opts?: { force?: boolean }) {
    const list = Array.from(files).filter((f) =>
      /image\/(png|jpeg|jpg|webp|avif|jxl)|application\/octet-stream/i.test(f.type) ||
      /\.(png|jpe?g|webp|avif|jxl)$/i.test(f.name),
    );
    if (!list.length) {
      lastError.value = 'No supported image files found.';
      return;
    }

    if (!opts?.force) {
      const existingBytes = items.value.reduce((s, i) => s + i.originalBytes, 0);
      const risk = assessBatchRisk(list, existingBytes, items.value.length);
      if (risk.level === 'warn' || risk.level === 'block') {
        pendingFiles = list;
        memoryWarning.value = risk;
        return;
      }
    }

    await commitFiles(list);
  }

  function dismissMemoryWarning() {
    memoryWarning.value = null;
    pendingFiles = null;
  }

  async function confirmMemoryWarning() {
    const files = pendingFiles;
    memoryWarning.value = null;
    pendingFiles = null;
    if (!files?.length) return;
    await commitFiles(files);
  }

  async function commitFiles(list: File[]) {
    const mapped: QueueItem[] = list.map((file) => ({
      id: uid(),
      file,
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      originalBytes: file.size,
      jxlBytes: null,
      status: 'queued' as const,
      thumbnailUrl: URL.createObjectURL(file),
      width: null,
      height: null,
      opfsPath: null,
      savingsPct: null,
    }));

    items.value.push(...mapped);

    if (!activeId.value) {
      activeId.value = mapped[0].id;
    }

    // Bulk / queue mode: keep mode and process new files immediately
    if (mode.value === 'auto-queue') {
      await startAutoQueue();
      return;
    }

    if (mapped.length === 1 && items.value.length === 1) {
      mode.value = 'single';
      activeId.value = mapped[0].id;
      await convertItem(mapped[0].id, true);
      return;
    }

    // Multi-file drop from single/step mode → switch to queue and run
    if (items.value.length > 1) {
      mode.value = 'auto-queue';
      await startAutoQueue();
    }
  }

  async function convertItem(id: string, needsPreview: boolean) {
    const item = items.value.find((i) => i.id === id);
    if (!item) return;

    const { pool: workerPool, queue: jobQueue } = ensureEngine();
    item.status = 'processing';
    isBusy.value = true;
    lastError.value = null;

    try {
      await jobQueue.add(async () => {
        const worker = workerPool.next();
        const buffer = await item.file.arrayBuffer();
        const result = await worker.convert({
          jobId: item.id,
          fileName: item.name,
          mimeType: item.mimeType,
          buffer,
          options: { ...options.value },
          needsPreview,
        });

        item.status = 'done';
        item.jxlBytes = result.jxlBytes;
        item.width = result.width;
        item.height = result.height;
        item.opfsPath = result.opfsPath;
        item.savingsPct =
          result.originalBytes > 0
            ? Math.round(((result.originalBytes - result.jxlBytes) / result.originalBytes) * 100)
            : 0;

        if (needsPreview && activeId.value === id) {
          closeBitmaps();
          originalBitmap.value = result.originalBitmap ?? null;
          previewBitmap.value = result.previewBitmap ?? null;
        } else {
          result.originalBitmap?.close();
          result.previewBitmap?.close();
        }
      });
    } catch (err) {
      item.status = 'error';
      item.error = err instanceof Error ? err.message : 'Conversion failed';
      lastError.value = item.error;
      if (isMemoryError(err)) {
        pause();
        memoryWarning.value = {
          level: 'block',
          title: 'Memory limit reached',
          message:
            'The browser ran out of memory while encoding. The queue was paused. Remove some images or convert smaller batches, then press Run Queue.',
          fileCount: items.value.length,
          totalBytes: items.value.reduce((s, i) => s + i.originalBytes, 0),
          heaviestBytes: items.value.reduce((m, i) => Math.max(m, i.originalBytes), 0),
        };
      }
    } finally {
      isBusy.value = (queue?.pending ?? 0) + (queue?.size ?? 0) > 0;
    }
  }

  async function reencodeActive() {
    if (!activeId.value) return;
    await convertItem(activeId.value, true);
  }

  async function startAutoQueue() {
    mode.value = 'auto-queue';
    isPaused.value = false;
    queue?.start();
    const pending = items.value.filter((i) => i.status === 'queued' || i.status === 'error');
    await Promise.all(pending.map((i) => convertItem(i.id, false)));
  }

  function pause() {
    isPaused.value = true;
    queue?.pause();
  }

  function resume() {
    isPaused.value = false;
    queue?.start();
  }

  /** Pause ↔ Run toggle for the auto-starting queue. */
  async function toggleQueue() {
    if (isBusy.value && !isPaused.value) {
      pause();
      return;
    }
    await startAutoQueue();
  }

  function selectItem(id: string) {
    activeId.value = id;
    const item = items.value.find((i) => i.id === id);
    if (item && item.status === 'done') {
      void inspectItem(id);
    }
  }

  async function inspectItem(id: string) {
    activeId.value = id;
    mode.value = items.value.length > 1 ? 'step-by-step' : 'single';
    await convertItem(id, true);
  }

  async function convertAndNext() {
    if (!activeId.value) return;
    await convertItem(activeId.value, true);
    const idx = items.value.findIndex((i) => i.id === activeId.value);
    const next = items.value[idx + 1];
    if (next) {
      activeId.value = next.id;
      await convertItem(next.id, true);
    }
  }

  async function goPrev() {
    const idx = items.value.findIndex((i) => i.id === activeId.value);
    if (idx <= 0) return;
    const prev = items.value[idx - 1];
    activeId.value = prev.id;
    mode.value = 'step-by-step';
    await convertItem(prev.id, true);
  }

  async function goNext() {
    const idx = items.value.findIndex((i) => i.id === activeId.value);
    if (idx < 0 || idx >= items.value.length - 1) return;
    const next = items.value[idx + 1];
    activeId.value = next.id;
    mode.value = 'step-by-step';
    await convertItem(next.id, true);
  }

  async function downloadItem(id: string) {
    const item = items.value.find((i) => i.id === id);
    if (!item || item.status !== 'done') return;
    const buffer = await readOpfsBuffer(id);
    const blob = new Blob([buffer], { type: 'image/jxl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const base = item.name.replace(/\.[^.]+$/, '');
    a.href = url;
    a.download = `${base}.jxl`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadAllZip() {
    const done = items.value.filter((i) => i.status === 'done');
    if (!done.length) return;

    const files: Record<string, Uint8Array> = {};
    for (const item of done) {
      const buffer = await readOpfsBuffer(item.id);
      const base = item.name.replace(/\.[^.]+$/, '');
      files[`${base}.jxl`] = new Uint8Array(buffer);
    }

    const zipped = zipSync(files, { level: 0 });
    const blob = new Blob([zipped], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jxl-converted.zip';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function removeItem(id: string) {
    const idx = items.value.findIndex((i) => i.id === id);
    if (idx < 0) return;
    const [item] = items.value.splice(idx, 1);
    if (item.thumbnailUrl) URL.revokeObjectURL(item.thumbnailUrl);
    await deleteOpfsFile(id);
    if (activeId.value === id) {
      closeBitmaps();
      activeId.value = items.value[0]?.id ?? null;
    }
  }

  async function clearAll() {
    revokeThumbnails();
    closeBitmaps();
    items.value = [];
    activeId.value = null;
    lastError.value = null;
    dismissMemoryWarning();
    await clearOpfsOutputs();
  }

  const queueToggleLabel = computed(() => {
    if (isBusy.value && !isPaused.value) return 'Pause Queue';
    return 'Run Queue';
  });

  return {
    mode,
    items,
    activeId,
    activeItem,
    options,
    isPaused,
    isBusy,
    originalBitmap,
    previewBitmap,
    lastError,
    memoryWarning,
    doneCount,
    totalSavings,
    queueToggleLabel,
    formatBytes,
    setMode,
    setOptions,
    addFiles,
    dismissMemoryWarning,
    confirmMemoryWarning,
    convertItem,
    reencodeActive,
    startAutoQueue,
    pause,
    resume,
    toggleQueue,
    selectItem,
    inspectItem,
    convertAndNext,
    goPrev,
    goNext,
    downloadItem,
    downloadAllZip,
    removeItem,
    clearAll,
  };
});
