<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useConverterStore } from '../../stores/useConverterStore';

const store = useConverterStore();
const { options, activeItem, mode, items, isBusy } = storeToRefs(store);

const savingsLabel = computed(() => {
  const item = activeItem.value;
  if (!item || item.jxlBytes == null) return null;
  return {
    original: store.formatBytes(item.originalBytes),
    jxl: store.formatBytes(item.jxlBytes),
    pct: item.savingsPct ?? 0,
  };
});

const stepIndex = computed(() => {
  if (!activeItem.value) return null;
  const idx = items.value.findIndex((i) => i.id === activeItem.value?.id);
  if (idx < 0) return null;
  return {
    current: idx + 1,
    total: items.value.length,
    isFirst: idx === 0,
    isLast: idx === items.value.length - 1,
  };
});

const allConverted = computed(
  () => items.value.length > 1 && items.value.every((i) => i.status === 'done'),
);

const showStepBrowse = computed(
  () => mode.value === 'step-by-step' && allConverted.value,
);

const showConvertNext = computed(
  () => mode.value === 'step-by-step' && items.value.length > 1 && !allConverted.value,
);

function onQuality(e: Event) {
  const value = Number((e.target as HTMLInputElement).value);
  store.setOptions({ quality: value, lossless: false });
  void store.reencodeActive();
}

function onEffort(e: Event) {
  store.setOptions({ effort: Number((e.target as HTMLInputElement).value) });
  void store.reencodeActive();
}

function onLossless(e: Event) {
  store.setOptions({ lossless: (e.target as HTMLInputElement).checked });
  void store.reencodeActive();
}
</script>

<template>
  <aside class="card flex h-full flex-col gap-5 rounded-sm p-5 sm:p-6">
    <div>
      <h2 class="text-base font-bold text-slate-950">Encode settings</h2>
      <p class="mt-1 text-sm font-medium text-slate-700">Changes re-encode the active image.</p>
    </div>

    <label class="block space-y-2">
      <div class="flex items-center justify-between text-sm font-semibold text-slate-800">
        <span>Quality</span>
        <span class="rounded-full bg-slate-200 px-2.5 py-0.5 font-mono text-slate-950">
          {{ options.quality }}
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        :value="options.quality"
        :disabled="options.lossless"
        class="w-full"
        @change="onQuality"
      />
    </label>

    <label class="block space-y-2">
      <div class="flex items-center justify-between text-sm font-semibold text-slate-800">
        <span>Effort</span>
        <span class="rounded-full bg-slate-200 px-2.5 py-0.5 font-mono text-slate-950">
          {{ options.effort }}
        </span>
      </div>
      <input
        type="range"
        min="1"
        max="9"
        :value="options.effort"
        class="w-full"
        @change="onEffort"
      />
    </label>

    <label
      class="flex items-center gap-3 rounded-sm border border-slate-300 bg-slate-100 px-3.5 py-3 text-base font-semibold text-slate-900"
    >
      <input
        type="checkbox"
        class="size-4 rounded border-slate-400"
        :checked="options.lossless"
        @change="onLossless"
      />
      Lossless
    </label>

    <div
      v-if="savingsLabel"
      class="rounded-sm bg-gradient-to-br from-sky-700 to-sky-500 px-4 py-4 text-white shadow-lg shadow-sky-600/25"
    >
      <div class="text-xs font-semibold uppercase tracking-wider text-white">Saved</div>
      <div class="mt-1 font-mono text-3xl font-bold tracking-tight text-white">
        -{{ savingsLabel.pct }}%
      </div>
      <div class="mt-1 font-mono text-sm font-medium text-white">
        {{ savingsLabel.original }} → {{ savingsLabel.jxl }}
      </div>
    </div>

    <div class="mt-auto flex flex-col gap-2.5 pt-2">
      <button
        type="button"
        class="rounded-full border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-950 shadow-sm hover:bg-slate-50 disabled:opacity-40"
        :disabled="!activeItem || isBusy"
        @click="store.reencodeActive()"
      >
        {{ isBusy ? 'Encoding…' : 'Re-encode' }}
      </button>

      <button
        v-if="showConvertNext"
        type="button"
        class="cursor-pointer rounded-full bg-slate-950 px-4 py-3 text-base font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="!activeItem || isBusy"
        @click="store.convertAndNext()"
      >
        <template v-if="stepIndex?.isLast">Convert</template>
        <template v-else>Convert &amp; Next</template>
        <span v-if="stepIndex" class="font-mono text-white/90">
          ({{ stepIndex.current }}/{{ stepIndex.total }})
        </span>
      </button>

      <div v-if="showStepBrowse" class="grid grid-cols-2 gap-2">
        <button
          type="button"
          class="cursor-pointer rounded-full border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-950 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="!stepIndex || stepIndex.isFirst || isBusy"
          @click="store.goPrev()"
        >
          ← Prev
        </button>
        <button
          type="button"
          class="cursor-pointer rounded-full border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-950 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="!stepIndex || stepIndex.isLast || isBusy"
          @click="store.goNext()"
        >
          Next →
        </button>
        <p class="col-span-2 text-center font-mono text-sm font-medium text-slate-700">
          {{ stepIndex?.current }}/{{ stepIndex?.total }} converted
        </p>
      </div>

      <button
        type="button"
        class="cursor-pointer rounded-full bg-sky-600 px-4 py-3.5 text-base font-semibold text-white shadow-md shadow-sky-600/25 hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="!activeItem || activeItem.status !== 'done'"
        @click="activeItem && store.downloadItem(activeItem.id)"
      >
        Download JXL
      </button>
    </div>
  </aside>
</template>
