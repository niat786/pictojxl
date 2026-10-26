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
      return 'bg-slate-100 text-slate-600';
    case 'processing':
      return 'bg-sky-100 text-sky-700';
    case 'done':
      return 'bg-emerald-100 text-emerald-700';
    case 'error':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-slate-100 text-slate-600';
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
      <div class="text-base font-medium text-slate-800">
        <span class="font-bold text-slate-950">{{ doneCount }}</span>
        /
        {{ items.length }} converted
        <span v-if="totalSavings" class="ml-2 font-semibold text-sky-700">
          saved {{ totalSavings.pct }}%
        </span>
        <span v-if="isPaused" class="ml-2 font-semibold text-amber-700">Paused</span>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-if="hasWork"
          type="button"
          class="cursor-pointer rounded-full border px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
          :class="
            isBusy && !isPaused
              ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
              : 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100'
          "
          @click="store.toggleQueue()"
        >
          {{ queueToggleLabel }}
        </button>
        <button
          type="button"
          class="cursor-pointer rounded-full bg-sky-500 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="doneCount === 0"
          @click="store.downloadAllZip()"
        >
          Download All (.ZIP)
        </button>
      </div>
    </div>

    <div class="max-h-[480px] space-y-3 overflow-y-auto md:hidden">
      <article
        v-for="item in items"
        :key="item.id"
        class="rounded-sm border border-slate-200 bg-slate-50/80 p-3"
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
            class="h-14 w-14 shrink-0 rounded-2xl object-cover"
          />
          <div class="min-w-0 flex-1">
            <p class="truncate text-base font-medium text-slate-900">{{ item.name }}</p>
            <span
              class="mt-1 inline-block rounded-full px-2.5 py-0.5 text-sm capitalize"
              :class="statusClass(item.status)"
            >
              {{ item.status }}
            </span>
          </div>
        </button>

        <div class="mt-3 space-y-1 border-t border-slate-200 pt-3 text-sm">
          <div class="flex justify-between gap-3">
            <span class="text-slate-500">Size</span>
            <span class="font-mono text-slate-800">{{ sizeLabel(item) }}</span>
          </div>
          <div class="flex justify-between gap-3">
            <span class="text-slate-500">Saved</span>
            <span class="font-mono text-sky-600">
              <template v-if="item.savingsPct != null">-{{ item.savingsPct }}%</template>
              <template v-else>—</template>
            </span>
          </div>
        </div>

        <div class="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            class="cursor-pointer rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            @click="store.inspectItem(item.id)"
          >
            Inspect
          </button>
          <button
            type="button"
            class="cursor-pointer rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="item.status !== 'done'"
            @click="store.downloadItem(item.id)"
          >
            Download
          </button>
          <button
            type="button"
            class="cursor-pointer rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:text-red-600"
            @click="store.removeItem(item.id)"
          >
            Remove
          </button>
        </div>
      </article>
    </div>

    <div class="hidden overflow-hidden rounded-sm border border-slate-200 bg-white md:block">
      <div class="max-h-[420px] overflow-auto">
        <table class="w-full text-left text-base">
          <thead class="sticky top-0 bg-slate-50 text-sm uppercase tracking-wide text-slate-500">
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
              class="border-t border-slate-100 hover:bg-sky-50/40"
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
                    class="h-9 w-9 rounded-xl object-cover"
                  />
                  <span class="truncate text-slate-800">{{ item.name }}</span>
                </button>
              </td>
              <td class="px-3 py-2.5">
                <span
                  class="rounded-full px-2.5 py-0.5 text-sm capitalize"
                  :class="statusClass(item.status)"
                >
                  {{ item.status }}
                </span>
              </td>
              <td class="px-3 py-2.5 font-mono text-sm text-slate-600">
                {{ sizeLabel(item) }}
              </td>
              <td class="px-3 py-2.5 font-mono text-sm text-sky-600">
                <template v-if="item.savingsPct != null">-{{ item.savingsPct }}%</template>
                <template v-else>—</template>
              </td>
              <td class="px-3 py-2.5">
                <div class="flex justify-end gap-3">
                  <button
                    type="button"
                    class="cursor-pointer text-sm text-slate-600 hover:text-slate-900"
                    @click="store.inspectItem(item.id)"
                  >
                    Inspect
                  </button>
                  <button
                    type="button"
                    class="cursor-pointer text-sm text-sky-600 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-40"
                    :disabled="item.status !== 'done'"
                    @click="store.downloadItem(item.id)"
                  >
                    Download
                  </button>
                  <button
                    type="button"
                    class="cursor-pointer text-sm text-slate-400 hover:text-red-600"
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
