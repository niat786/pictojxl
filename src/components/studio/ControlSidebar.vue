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

/** Once every image is converted, swap Convert & Next for Prev / Next browse. */
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
  <aside class="glass flex h-full flex-col gap-5 rounded-2xl p-5">
    <div>
      <h2 class="text-base font-semibold text-zinc-100">Encode settings</h2>
      <p class="mt-1 text-sm text-zinc-400">Changes re-encode the active image.</p>
    </div>

    <label class="block space-y-2">
      <div class="flex items-center justify-between text-sm text-zinc-300">
        <span>Quality</span>
        <span class="font-mono text-zinc-100">{{ options.quality }}</span>
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
      <div class="flex items-center justify-between text-sm text-zinc-300">
        <span>Effort</span>
        <span class="font-mono text-zinc-100">{{ options.effort }}</span>
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

    <label class="flex items-center gap-2.5 text-base text-zinc-200">
      <input
        type="checkbox"
        class="size-4 rounded border-white/20 bg-zinc-700"
        :checked="options.lossless"
        @change="onLossless"
      />
      Lossless
    </label>

    <div
      v-if="savingsLabel"
      class="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-3.5"
    >
      <div class="text-xs uppercase tracking-wider text-emerald-400/90">Saved</div>
      <div class="mt-1 font-mono text-xl font-semibold text-emerald-300">
        -{{ savingsLabel.pct }}%
      </div>
      <div class="mt-1 font-mono text-sm text-zinc-300">
        {{ savingsLabel.original }} → {{ savingsLabel.jxl }}
      </div>
    </div>

    <div class="mt-auto flex flex-col gap-2.5 pt-2">
      <button
        type="button"
        class="rounded-xl border border-white/10 bg-zinc-700/80 px-4 py-3 text-base text-zinc-100 hover:border-white/20 disabled:opacity-40"
        :disabled="!activeItem || isBusy"
        @click="store.reencodeActive()"
      >
        {{ isBusy ? 'Encoding…' : 'Re-encode' }}
      </button>

      <button
        v-if="showConvertNext"
        type="button"
        class="cursor-pointer rounded-xl bg-indigo-500 px-4 py-3 text-base font-semibold text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="!activeItem || isBusy"
        @click="store.convertAndNext()"
      >
        <template v-if="stepIndex?.isLast">Convert</template>
        <template v-else>Convert &amp; Next</template>
        <span v-if="stepIndex" class="font-mono opacity-80">
          ({{ stepIndex.current }}/{{ stepIndex.total }})
        </span>
      </button>

      <div v-if="showStepBrowse" class="grid grid-cols-2 gap-2">
        <button
          type="button"
          class="cursor-pointer rounded-xl border border-white/10 bg-zinc-700/80 px-4 py-3 text-base font-semibold text-zinc-100 hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="!stepIndex || stepIndex.isFirst || isBusy"
          @click="store.goPrev()"
        >
          ← Prev
        </button>
        <button
          type="button"
          class="cursor-pointer rounded-xl border border-white/10 bg-zinc-700/80 px-4 py-3 text-base font-semibold text-zinc-100 hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="!stepIndex || stepIndex.isLast || isBusy"
          @click="store.goNext()"
        >
          Next →
        </button>
        <p class="col-span-2 text-center font-mono text-sm text-zinc-400">
          {{ stepIndex?.current }}/{{ stepIndex?.total }} converted
        </p>
      </div>

      <button
        type="button"
        class="cursor-pointer rounded-xl bg-emerald-500 px-4 py-3.5 text-base font-semibold text-zinc-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="!activeItem || activeItem.status !== 'done'"
        @click="activeItem && store.downloadItem(activeItem.id)"
      >
        Download JXL
      </button>
    </div>
  </aside>
</template>
