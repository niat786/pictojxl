<script setup lang="ts">
withDefaults(
  defineProps<{
    id: string;
    width?: number;
    height?: number;
  }>(),
  {
    width: 300,
    height: 250,
  },
);
</script>

<template>
  <aside
    :id="id"
    class="relative w-full overflow-hidden rounded-xl border border-white/5 bg-zinc-900/40"
    :style="{ minHeight: `${height}px` }"
    :data-ad-slot="id"
    aria-label="Advertisement"
  >
    <div class="pointer-events-none absolute left-3 top-2 ad-label">Advertisement</div>
    <div
      class="flex w-full items-center justify-center px-4 py-6 text-center text-xs text-zinc-600"
      :style="{ minHeight: `${height}px` }"
    >
      Reserved {{ width }}×{{ height }} ad placement
    </div>
  </aside>
</template>
