<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

const props = defineProps<{
  original: ImageBitmap | null;
  preview: ImageBitmap | null;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const split = ref(0.5);
const zoom = ref(1);
const panX = ref(0);
const panY = ref(0);
const draggingSplit = ref(false);
const draggingPan = ref(false);
const lastPointer = ref({ x: 0, y: 0 });

const zoomLabel = computed(() => `${Math.round(zoom.value * 100)}%`);

function draw() {
  const canvas = canvasRef.value;
  const container = containerRef.value;
  if (!canvas || !container) return;

  const dpr = window.devicePixelRatio || 1;
  const w = container.clientWidth;
  const h = container.clientHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // Checkerboard
  const size = 12;
  for (let y = 0; y < h; y += size) {
    for (let x = 0; x < w; x += size) {
      const odd = ((x / size) + (y / size)) % 2 === 0;
      ctx.fillStyle = odd ? '#27272a' : '#3f3f46';
      ctx.fillRect(x, y, size, size);
    }
  }

  const bmp = props.original ?? props.preview;
  if (!bmp) return;

  const fit = Math.min(w / bmp.width, h / bmp.height) * 0.92;
  const scale = fit * zoom.value;
  const dw = bmp.width * scale;
  const dh = bmp.height * scale;
  const dx = (w - dw) / 2 + panX.value;
  const dy = (h - dh) / 2 + panY.value;

  if (props.original) {
    ctx.drawImage(props.original, dx, dy, dw, dh);
  }

  if (props.preview) {
    const clipX = w * split.value;
    ctx.save();
    ctx.beginPath();
    ctx.rect(clipX, 0, w - clipX, h);
    ctx.clip();
    ctx.drawImage(props.preview, dx, dy, dw, dh);
    ctx.restore();
  }

  // Split line
  const sx = w * split.value;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(sx - 1, 0, 2, h);
  ctx.beginPath();
  ctx.arc(sx, h / 2, 14, 0, Math.PI * 2);
  ctx.fillStyle = '#27272a';
  ctx.fill();
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = 'rgba(39,39,42,0.85)';
  ctx.fillRect(12, 12, 92, 28);
  ctx.fillRect(w - 72, 12, 60, 28);
  ctx.fillStyle = '#e4e4e7';
  ctx.font = '14px ui-sans-serif, system-ui, -apple-system, sans-serif';
  ctx.fillText('Original', 22, 31);
  ctx.fillText('JXL', w - 52, 31);
}

function onPointerDown(e: PointerEvent) {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const splitX = rect.width * split.value;
  if (Math.abs(x - splitX) < 18) {
    draggingSplit.value = true;
  } else {
    draggingPan.value = true;
    lastPointer.value = { x: e.clientX, y: e.clientY };
  }
  canvas.setPointerCapture(e.pointerId);
}

function onPointerMove(e: PointerEvent) {
  const canvas = canvasRef.value;
  if (!canvas) return;
  if (draggingSplit.value) {
    const rect = canvas.getBoundingClientRect();
    split.value = Math.min(0.92, Math.max(0.08, (e.clientX - rect.left) / rect.width));
    draw();
  } else if (draggingPan.value) {
    panX.value += e.clientX - lastPointer.value.x;
    panY.value += e.clientY - lastPointer.value.y;
    lastPointer.value = { x: e.clientX, y: e.clientY };
    draw();
  }
}

function onPointerUp(e: PointerEvent) {
  draggingSplit.value = false;
  draggingPan.value = false;
  canvasRef.value?.releasePointerCapture(e.pointerId);
}

function setZoom(next: number) {
  zoom.value = Math.min(4, Math.max(1, next));
  draw();
}

function resetView() {
  zoom.value = 1;
  panX.value = 0;
  panY.value = 0;
  split.value = 0.5;
  draw();
}

let ro: ResizeObserver | null = null;

onMounted(() => {
  draw();
  if (containerRef.value) {
    ro = new ResizeObserver(() => draw());
    ro.observe(containerRef.value);
  }
});

onUnmounted(() => {
  ro?.disconnect();
});

watch(() => [props.original, props.preview], () => {
  resetView();
});

defineExpose({ setZoom, resetView, zoom });
</script>

<template>
  <div class="flex h-full min-h-[360px] flex-col gap-3">
    <div
      ref="containerRef"
      class="relative min-h-[320px] flex-1 overflow-hidden rounded-xl border border-white/10 bg-zinc-800"
    >
      <canvas
        ref="canvasRef"
        class="h-full w-full cursor-crosshair touch-none"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      />
      <div
        v-if="!original && !preview"
        class="absolute inset-0 flex items-center justify-center text-base text-zinc-400"
      >
        Drop an image to inspect
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="rounded-lg border border-white/10 bg-zinc-700 px-3.5 py-2 text-sm text-zinc-200 hover:border-white/20"
        @click="setZoom(zoom - 0.25)"
      >
        −
      </button>
      <span class="min-w-14 text-center font-mono text-sm text-zinc-300">{{ zoomLabel }}</span>
      <button
        type="button"
        class="rounded-lg border border-white/10 bg-zinc-700 px-3.5 py-2 text-sm text-zinc-200 hover:border-white/20"
        @click="setZoom(zoom + 0.25)"
      >
        +
      </button>
      <button
        type="button"
        class="rounded-lg border border-white/10 bg-zinc-700 px-3.5 py-2 text-sm text-zinc-200 hover:border-white/20"
        @click="setZoom(1)"
      >
        100%
      </button>
      <button
        type="button"
        class="rounded-lg border border-white/10 bg-zinc-700 px-3.5 py-2 text-sm text-zinc-200 hover:border-white/20"
        @click="setZoom(4)"
      >
        400%
      </button>
      <button
        type="button"
        class="rounded-lg border border-white/10 bg-zinc-700 px-3.5 py-2 text-sm text-zinc-200 hover:border-white/20"
        @click="resetView"
      >
        Reset
      </button>
    </div>
  </div>
</template>
