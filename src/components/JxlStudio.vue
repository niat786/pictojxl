<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useConverterStore } from '../stores/useConverterStore';
import SplitComparisonCanvas from './studio/SplitComparisonCanvas.vue';
import QueueManager from './studio/QueueManager.vue';
import ControlSidebar from './studio/ControlSidebar.vue';
import MemoryWarningModal from './studio/MemoryWarningModal.vue';
import type { StudioMode } from '../lib/types';

const props = withDefaults(
  defineProps<{
    headline?: string;
    subheadline?: string;
    dropzoneLabel?: string;
    acceptHint?: string;
    defaultMode?: StudioMode;
  }>(),
  {
    headline: 'Free Online JPEG XL (JXL) Converter & Compression Studio',
    subheadline:
      'Convert PNG, JPG, and WebP to next-gen JPEG XL instantly. 100% free, private, and powered by WebAssembly—no uploads required.',
    dropzoneLabel: 'Drop images here or click to browse',
    acceptHint: 'PNG, JPG, WebP, AVIF, JXL — single or 200+ files',
    defaultMode: 'single',
  },
);

const store = useConverterStore();
const {
  items,
  mode,
  originalBitmap,
  previewBitmap,
  lastError,
  isBusy,
  memoryWarning,
} = storeToRefs(store);

const dragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const hasFiles = computed(() => items.value.length > 0);
const showInspector = computed(
  () =>
    hasFiles.value &&
    (mode.value === 'single' || mode.value === 'step-by-step') &&
    (originalBitmap.value || previewBitmap.value || isBusy.value),
);
const showQueue = computed(() => hasFiles.value && mode.value === 'auto-queue');

onMounted(() => {
  store.setMode(props.defaultMode);
});

onUnmounted(() => {
  void store.clearAll();
});

function onFiles(files: FileList | File[] | null) {
  if (!files?.length) return;
  void store.addFiles(files);
}

function onDrop(e: DragEvent) {
  e.preventDefault();
  dragging.value = false;
  onFiles(e.dataTransfer?.files ?? null);
}

function setUiMode(next: StudioMode) {
  store.setMode(next);
  if (next === 'auto-queue' && items.value.some((i) => i.status === 'queued')) {
    void store.startAutoQueue();
  } else if (next !== 'auto-queue' && store.activeId) {
    void store.inspectItem(store.activeId);
  }
}

async function loadSample() {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const grad = ctx.createLinearGradient(0, 0, 640, 400);
    grad.addColorStop(0, '#34d399');
    grad.addColorStop(0.5, '#6366f1');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 400);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 42px ui-sans-serif, system-ui, -apple-system, sans-serif';
    ctx.fillText('PictoJXL', 48, 200);
    ctx.font = '20px ui-sans-serif, system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('Sample · pictojxl.com', 48, 240);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png'),
    );
    if (!blob) return;
    const file = new File([blob], 'studio-sample.png', { type: 'image/png' });
    await store.addFiles([file]);
  } catch {
    lastError.value = 'Could not create sample image.';
  }
}
</script>

<template>
  <section class="mx-auto max-w-7xl px-4 py-6 sm:px-6">
    <div class="mb-6 max-w-3xl">
      <h1 class="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-[2.5rem] sm:leading-tight">
        {{ headline }}
      </h1>
      <p class="mt-3 text-lg leading-relaxed text-zinc-300">
        {{ subheadline }}
      </p>
    </div>

    <div
      v-if="hasFiles"
      class="mb-4 flex flex-wrap items-center justify-between gap-3"
    >
      <div
        class="inline-flex rounded-xl border border-white/10 bg-zinc-700/70 p-1 text-base"
        role="tablist"
        aria-label="Studio mode"
      >
        <button
          type="button"
          class="rounded-lg px-3.5 py-2 transition"
          :class="mode === 'single' ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-300 hover:text-zinc-100'"
          @click="setUiMode('single')"
        >
          Single
        </button>
        <button
          type="button"
          class="rounded-lg px-3.5 py-2 transition"
          :class="mode === 'step-by-step' ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-300 hover:text-zinc-100'"
          @click="setUiMode('step-by-step')"
        >
          Step-by-Step
        </button>
        <button
          type="button"
          class="rounded-lg px-3.5 py-2 transition"
          :class="mode === 'auto-queue' ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-300 hover:text-zinc-100'"
          @click="setUiMode('auto-queue')"
        >
          Queue
        </button>
      </div>
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded-lg border border-white/10 px-3.5 py-2 text-base text-zinc-200 hover:border-white/20"
          @click="fileInput?.click()"
        >
          Add files
        </button>
        <button
          type="button"
          class="rounded-lg border border-white/10 px-3.5 py-2 text-base text-zinc-400 hover:border-red-500/30 hover:text-red-300"
          @click="store.clearAll()"
        >
          Clear
        </button>
      </div>
    </div>

    <p v-if="lastError" class="mb-3 text-base text-red-300">{{ lastError }}</p>

    <!-- Always-on workspace: main canvas + encode controls -->
    <div
      class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]"
      @dragenter.prevent="dragging = true"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop="onDrop"
    >
      <div class="glass relative min-h-[420px] overflow-hidden rounded-2xl p-4">
        <!-- Empty dropzone -->
        <div
          v-if="!hasFiles"
          class="relative flex h-full min-h-[388px] flex-col items-center justify-center"
        >
          <button
            type="button"
            class="flex w-full flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center transition"
            :class="dragging ? 'bg-emerald-500/10' : ''"
            @click="fileInput?.click()"
          >
            <div
              class="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 16V4m0 0l-4 4m4-4l4 4M4 16.5V18a2 2 0 002 2h12a2 2 0 002-2v-1.5"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
            <div>
              <div class="text-xl font-medium text-zinc-100">{{ dropzoneLabel }}</div>
              <div class="mt-2 text-base text-zinc-400">{{ acceptHint }}</div>
            </div>
            <span
              class="rounded-xl bg-emerald-500 px-6 py-3 text-base font-semibold text-zinc-950"
            >
              Choose images
            </span>
          </button>
          <button
            type="button"
            class="mb-2 rounded-xl border border-white/10 bg-zinc-700/90 px-6 py-3 text-base text-zinc-200 hover:border-white/20 hover:text-white"
            @click="loadSample"
          >
            Try sample image
          </button>
        </div>

        <!-- Active workspace -->
        <template v-else>
          <QueueManager v-if="showQueue" />
          <SplitComparisonCanvas
            v-else
            :original="originalBitmap"
            :preview="previewBitmap"
          />
          <div
            v-if="!showQueue && !showInspector && isBusy"
            class="mt-4 text-center text-base text-zinc-300"
          >
            Encoding with WebAssembly…
          </div>
        </template>
      </div>

      <div class="min-w-0">
        <ControlSidebar />
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      class="hidden"
      accept="image/png,image/jpeg,image/webp,image/avif,image/jxl,.jxl"
      multiple
      @change="onFiles(($event.target as HTMLInputElement).files)"
    />

    <MemoryWarningModal
      v-if="memoryWarning"
      :title="memoryWarning.title"
      :message="memoryWarning.message"
      :blocking="memoryWarning.level === 'block'"
      @cancel="store.dismissMemoryWarning()"
      @confirm="store.confirmMemoryWarning()"
    />
  </section>
</template>
