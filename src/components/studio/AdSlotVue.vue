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
    class="relative w-full overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white/70"
    :style="{ minHeight: `${height}px` }"
    :data-ad-slot="id"
    aria-label="Advertisement"
  >
    <div class="pointer-events-none absolute left-3 top-2 ad-label">Advertisement</div>
    <div
      class="flex w-full items-center justify-center px-4 py-6 text-center text-xs text-slate-400"
      :style="{ minHeight: `${height}px` }"
    >
      Reserved {{ width }}×{{ height }} ad placement
    </div>
  </aside>
</template>
