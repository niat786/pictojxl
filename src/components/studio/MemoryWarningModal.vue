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
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="'memory-warn-title'"
    @click.self="emit('cancel')"
  >
    <div class="glass w-full max-w-md rounded-2xl p-6 shadow-2xl">
      <h2 id="memory-warn-title" class="text-lg font-semibold text-zinc-50">
        {{ title }}
      </h2>
      <p class="mt-3 text-base leading-relaxed text-zinc-300">
        {{ message }}
      </p>
      <div class="mt-6 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          class="cursor-pointer rounded-xl border border-white/10 bg-zinc-700/80 px-4 py-2.5 text-base text-zinc-100 hover:border-white/20"
          @click="emit('cancel')"
        >
          {{ blocking ? 'OK' : 'Cancel' }}
        </button>
        <button
          v-if="!blocking"
          type="button"
          class="cursor-pointer rounded-xl bg-amber-500 px-4 py-2.5 text-base font-semibold text-zinc-950 hover:bg-amber-400"
          @click="emit('confirm')"
        >
          Continue anyway
        </button>
      </div>
    </div>
  </div>
</template>
