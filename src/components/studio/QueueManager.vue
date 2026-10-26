<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useConverterStore } from '../../stores/useConverterStore';
import type { JobStatus } from '../../lib/types';

const store = useConverterStore();
const { items, isPaused, doneCount, totalSavings, isBusy, queueToggleLabel } =
  storeToRefs(store);

const hasWork = computed(
  () =>
    items.value.some(
      (i) =>
        i.status === 'queued' || i.status === 'error' || i.status === 'processing',
    ) ||
    isBusy.value ||
    isPaused.value,
);

function statusClass(status: JobStatus): string {
  switch (status) {
    case 'queued':
      return 'bg-zinc-700 text-zinc-300';
    case 'processing':
      return 'bg-indigo-500/15 text-indigo-300';
    case 'done':
      return 'bg-emerald-500/15 text-emerald-300';
    case 'error':
      return 'bg-red-500/15 text-red-300';
    default:
      return 'bg-zinc-700 text-zinc-300';
  }
}

function sizeLabel(item: (typeof items.value)[number]): string {
  if (item.jxlBytes != null) {
    return `${store.formatBytes(item.originalBytes)} → ${store.formatBytes(item.jxlBytes)}`;
  }
  return store.formatBytes(item.originalBytes);
}
</script>

<template>
  <div class="flex h-full min-h-[360px] flex-col gap-3">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="text-base text-zinc-300">
        <span class="text-zinc-50">{{ doneCount }}</span>
        /
        {{ items.length }} converted
        <span v-if="totalSavings" class="ml-2 text-emerald-400">
          saved {{ totalSavings.pct }}%
        </span>
        <span v-if="isPaused" class="ml-2 text-amber-300">Paused</span>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-if="hasWork"
          type="button"
          class="cursor-pointer rounded-lg border px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
          :class="
            isBusy && !isPaused
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-200 hover:border-amber-400/60'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:border-emerald-400/50'
          "
          @click="store.toggleQueue()"
        >
          {{ queueToggleLabel }}
        </button>
        <button
          type="button"
          class="cursor-pointer rounded-lg bg-emerald-500 px-3.5 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="doneCount === 0"
          @click="store.downloadAllZip()"
        >
          Download All (.ZIP)
        </button>
      </div>
    </div>

    <!-- Mobile / small screens: stacked cards (no horizontal scroll) -->
    <div class="max-h-[480px] space-y-3 overflow-y-auto md:hidden">
      <article
        v-for="item in items"
        :key="item.id"
        class="rounded-xl border border-white/10 bg-zinc-800/50 p-3"
      >
        <button
          type="button"
          class="flex w-full min-w-0 cursor-pointer items-center gap-3 text-left"
          @click="store.inspectItem(item.id)"
        >
          <img
            v-if="item.thumbnailUrl"
            :src="item.thumbnailUrl"
            alt=""
            class="h-14 w-14 shrink-0 rounded-lg object-cover"
          />
          <div class="min-w-0 flex-1">
            <p class="truncate text-base font-medium text-zinc-50">{{ item.name }}</p>
            <span
              class="mt-1 inline-block rounded-md px-2 py-0.5 text-sm capitalize"
              :class="statusClass(item.status)"
            >
              {{ item.status }}
            </span>
          </div>
        </button>

        <div class="mt-3 space-y-1 border-t border-white/5 pt-3 text-sm">
          <div class="flex justify-between gap-3">
            <span class="text-zinc-400">Size</span>
            <span class="font-mono text-zinc-200">{{ sizeLabel(item) }}</span>
          </div>
          <div class="flex justify-between gap-3">
            <span class="text-zinc-400">Saved</span>
            <span class="font-mono text-emerald-400">
              <template v-if="item.savingsPct != null">-{{ item.savingsPct }}%</template>
              <template v-else>—</template>
            </span>
          </div>
        </div>

        <div class="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            class="cursor-pointer rounded-lg border border-white/10 bg-zinc-700/80 px-3 py-2 text-sm text-zinc-100"
            @click="store.inspectItem(item.id)"
          >
            Inspect
          </button>
          <button
            type="button"
            class="cursor-pointer rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="item.status !== 'done'"
            @click="store.downloadItem(item.id)"
          >
            Download
          </button>
          <button
            type="button"
            class="cursor-pointer rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-400 hover:text-red-300"
            @click="store.removeItem(item.id)"
          >
            Remove
          </button>
        </div>
      </article>
    </div>

    <!-- Desktop: table rows -->
    <div class="hidden overflow-hidden rounded-xl border border-white/10 bg-zinc-800/40 md:block">
      <div class="max-h-[420px] overflow-auto">
        <table class="w-full text-left text-base">
          <thead class="sticky top-0 bg-zinc-800/95 text-sm uppercase tracking-wide text-zinc-400">
            <tr>
              <th class="px-3 py-2.5 font-medium">File</th>
              <th class="px-3 py-2.5 font-medium">Status</th>
              <th class="px-3 py-2.5 font-medium">Size</th>
              <th class="px-3 py-2.5 font-medium">Saved</th>
              <th class="px-3 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in items"
              :key="item.id"
              class="border-t border-white/5 hover:bg-white/[0.04]"
            >
              <td class="px-3 py-2.5">
                <button
                  type="button"
                  class="flex max-w-[220px] cursor-pointer items-center gap-2 text-left"
                  @click="store.inspectItem(item.id)"
                >
                  <img
                    v-if="item.thumbnailUrl"
                    :src="item.thumbnailUrl"
                    alt=""
                    class="h-9 w-9 rounded object-cover"
                  />
                  <span class="truncate text-zinc-100">{{ item.name }}</span>
                </button>
              </td>
              <td class="px-3 py-2.5">
                <span
                  class="rounded-md px-2 py-0.5 text-sm capitalize"
                  :class="statusClass(item.status)"
                >
                  {{ item.status }}
                </span>
              </td>
              <td class="px-3 py-2.5 font-mono text-sm text-zinc-300">
                {{ sizeLabel(item) }}
              </td>
              <td class="px-3 py-2.5 font-mono text-sm text-emerald-400">
                <template v-if="item.savingsPct != null">-{{ item.savingsPct }}%</template>
                <template v-else>—</template>
              </td>
              <td class="px-3 py-2.5">
                <div class="flex justify-end gap-3">
                  <button
                    type="button"
                    class="cursor-pointer text-sm text-zinc-300 hover:text-zinc-50"
                    @click="store.inspectItem(item.id)"
                  >
                    Inspect
                  </button>
                  <button
                    type="button"
                    class="cursor-pointer text-sm text-emerald-400 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                    :disabled="item.status !== 'done'"
                    @click="store.downloadItem(item.id)"
                  >
                    Download
                  </button>
                  <button
                    type="button"
                    class="cursor-pointer text-sm text-zinc-400 hover:text-red-300"
                    @click="store.removeItem(item.id)"
                  >
                    Remove
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
