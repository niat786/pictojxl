<script setup lang="ts">
defineProps<{
  title: string;
  message: string;
  blocking?: boolean;
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="'memory-warn-title'"
    @click.self="emit('cancel')"
  >
    <div class="card w-full max-w-md rounded-[1.75rem] p-6">
      <h2 id="memory-warn-title" class="text-lg font-semibold text-slate-900">
        {{ title }}
      </h2>
      <p class="mt-3 text-base leading-relaxed text-slate-600">
        {{ message }}
      </p>
      <div class="mt-6 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          class="cursor-pointer rounded-full border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-700 shadow-sm hover:bg-slate-50"
          @click="emit('cancel')"
        >
          {{ blocking ? 'OK' : 'Cancel' }}
        </button>
        <button
          v-if="!blocking"
          type="button"
          class="cursor-pointer rounded-full bg-amber-500 px-4 py-2.5 text-base font-semibold text-white hover:bg-amber-400"
          @click="emit('confirm')"
        >
          Continue anyway
        </button>
      </div>
    </div>
  </div>
</template>
